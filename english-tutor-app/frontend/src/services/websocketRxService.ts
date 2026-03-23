/**
 * RxJS-based WebSocket Service
 * Wraps WebSocket in RxJS Observables for reactive event handling
 */
import { Observable, Subject, timer, throwError } from 'rxjs';
import { retryWhen, delayWhen, scan, catchError, share, map } from 'rxjs/operators';
import { logger } from '../utils/logger';
import { eventBus } from './eventBus';

export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp?: string;
  conversationId?: string;
}

interface WebSocketConfig {
  baseUrl: string;
  conversationId: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

class WebSocketRxService {
  private ws: WebSocket | null = null;
  private url: string;
  private conversationId: string;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private shouldReconnect = true;
  
  // RxJS Subjects for events
  private message$ = new Subject<WebSocketMessage>();
  private connectionStateSubject$ = new Subject<'connecting' | 'open' | 'closing' | 'closed'>();
  private error$ = new Subject<Error>();

  // Public Observables
  public messages$: Observable<WebSocketMessage>;
  public connectionState$: Observable<'connecting' | 'open' | 'closing' | 'closed'>;
  public errors$: Observable<Error>;

  constructor(config: WebSocketConfig) {
    this.conversationId = config.conversationId;
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? 5;
    this.reconnectDelay = config.reconnectDelay ?? 1000;

    // Build WebSocket URL
    let wsProtocol = 'ws';
    let wsBaseUrl = config.baseUrl;
    
    if (config.baseUrl.startsWith('https://')) {
      wsProtocol = 'wss';
      wsBaseUrl = config.baseUrl.replace(/^https:\/\//, '');
    } else if (config.baseUrl.startsWith('http://')) {
      wsProtocol = 'ws';
      wsBaseUrl = config.baseUrl.replace(/^http:\/\//, '');
    }
    
    wsBaseUrl = wsBaseUrl.replace(/\/$/, '');
    this.url = `${wsProtocol}://${wsBaseUrl}/ws?conversationId=${encodeURIComponent(config.conversationId)}`;

    // Create shared observables
    this.messages$ = this.message$.asObservable().pipe(share());
    this.connectionState$ = this.connectionStateSubject$.asObservable().pipe(share());
    this.errors$ = this.error$.asObservable().pipe(share());

    logger.debug('WebSocketRxService created', { url: this.url, conversationId: this.conversationId });
  }

  /**
   * Connect to WebSocket with automatic reconnection
   */
  connect(): Observable<void> {
    return new Observable<void>(observer => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        logger.info('WebSocket already connected');
        observer.next();
        observer.complete();
        return;
      }

      try {
        this.connectionStateSubject$.next('connecting');
        logger.info(`Connecting to WebSocket: ${this.url}`);
        
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          logger.info('WebSocket connected', { conversationId: this.conversationId });
          this.connectionStateSubject$.next('open');
          
          // Emit connected event to event bus
          eventBus.emit({
            type: 'websocket:connected',
            data: { conversationId: this.conversationId },
            conversationId: this.conversationId,
          });
          
          observer.next();
          observer.complete();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            logger.info('WebSocket message received', { 
              type: message.type, 
              conversationId: message.conversationId || this.conversationId,
              hasData: !!message.data 
            });
            
            // Emit to message stream
            this.message$.next(message);
            
            // Forward to event bus
            const eventToEmit = {
              type: message.type,
              data: message.data,
              ...(message.timestamp && { timestamp: message.timestamp }),
              conversationId: message.conversationId || this.conversationId,
            };
            
            logger.debug('Forwarding WebSocket message to event bus', { 
              type: eventToEmit.type,
              conversationId: eventToEmit.conversationId 
            });
            
            eventBus.emit(eventToEmit);
          } catch (error) {
            logger.error('Error parsing WebSocket message', error);
            this.error$.next(error instanceof Error ? error : new Error(String(error)));
          }
        };

        this.ws.onerror = (error) => {
          logger.error('WebSocket error', { error, url: this.url });
          this.connectionStateSubject$.next('closed');
          this.error$.next(new Error('WebSocket connection error'));
          
          eventBus.emit({
            type: 'websocket:error',
            data: { error: 'Connection error' },
            conversationId: this.conversationId,
          });
        };

        this.ws.onclose = (event) => {
          logger.info('WebSocket closed', { 
            code: event.code, 
            reason: event.reason,
            wasClean: event.wasClean 
          });
          
          this.connectionStateSubject$.next('closed');
          this.ws = null;

          eventBus.emit({
            type: 'websocket:closed',
            data: { code: event.code, reason: event.reason },
            conversationId: this.conversationId,
          });

          // Attempt reconnection if needed
          if (this.shouldReconnect && !event.wasClean && event.code !== 1000) {
            this.reconnect();
          }
        };
      } catch (error) {
        logger.error('Error creating WebSocket', error);
        this.error$.next(error instanceof Error ? error : new Error(String(error)));
        observer.error(error);
      }
    }).pipe(
      retryWhen(errors =>
        errors.pipe(
          scan((acc, error) => {
            const retryCount = acc + 1;
            if (retryCount > this.maxReconnectAttempts) {
              throw error;
            }
            return retryCount;
          }, 0),
          delayWhen(retryCount => {
            const delay = this.reconnectDelay * Math.pow(2, retryCount - 1);
            logger.info(`Reconnecting in ${delay}ms (attempt ${retryCount}/${this.maxReconnectAttempts})`);
            return timer(delay);
          })
        )
      ),
      catchError(error => {
        logger.error('WebSocket connection failed after retries', error);
        return throwError(() => error);
      }),
      map(() => undefined) // Convert to Observable<void>
    );
  }

  /**
   * Reconnect to WebSocket
   */
  private reconnect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    timer(this.reconnectDelay).subscribe(() => {
      logger.info('Attempting WebSocket reconnection');
      this.connect().subscribe({
        error: (err) => logger.error('Reconnection failed', err),
      });
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      // Only close if not already closing or closed
      const readyState = this.ws.readyState;
      if (readyState === WebSocket.CONNECTING || readyState === WebSocket.OPEN) {
        try {
          // Set onclose handler to null to prevent error logging
          this.ws.onclose = null;
          this.ws.onerror = null;
          this.ws.close(1000, 'Client disconnect');
        } catch (error) {
          logger.warn('Error closing WebSocket', error);
        }
      } else if (readyState === WebSocket.CLOSING) {
        // Already closing, just wait
        logger.debug('WebSocket already closing');
      } else {
        // Already closed
        logger.debug('WebSocket already closed');
      }
      this.ws = null;
    }
    
    // Complete subjects only if they haven't been completed
    if (!this.message$.closed) {
      this.message$.complete();
    }
    if (!this.connectionStateSubject$.closed) {
      this.connectionStateSubject$.complete();
    }
    if (!this.error$.closed) {
      this.error$.complete();
    }
    
    eventBus.emit({
      type: 'websocket:disconnected',
      data: {},
      conversationId: this.conversationId,
    });
  }

  /**
   * Send message to server
   */
  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      logger.debug('WebSocket message sent', { type: message.type });
    } else {
      logger.warn('WebSocket not connected, cannot send message');
      this.error$.next(new Error('WebSocket not connected'));
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current connection state
   */
  getState(): 'connecting' | 'open' | 'closing' | 'closed' {
    if (!this.ws) return 'closed';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'open';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'closed';
      default:
        return 'closed';
    }
  }
}

export default WebSocketRxService;

