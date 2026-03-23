/**
 * WebSocket Service for Real-time Communication
 */
import { logger as logUtil } from '../utils/logger';

export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp?: string;
  conversationId?: string;
}

export type WebSocketEventHandler = (message: WebSocketMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private conversationId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private isConnecting = false;
  private shouldReconnect = true;

  constructor(baseUrl: string, conversationId: string) {
    // Convert http:// to ws:// or https:// to wss://
    let wsProtocol = 'ws';
    let wsBaseUrl = baseUrl;
    
    if (baseUrl.startsWith('https://')) {
      wsProtocol = 'wss';
      wsBaseUrl = baseUrl.replace(/^https:\/\//, '');
    } else if (baseUrl.startsWith('http://')) {
      wsProtocol = 'ws';
      wsBaseUrl = baseUrl.replace(/^http:\/\//, '');
    }
    
    // Remove trailing slash if present
    wsBaseUrl = wsBaseUrl.replace(/\/$/, '');
    
    this.url = `${wsProtocol}://${wsBaseUrl}/ws?conversationId=${encodeURIComponent(conversationId)}`;
    this.conversationId = conversationId;
    
    logger.debug('WebSocketService created', { baseUrl, conversationId, finalUrl: this.url });
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      logger.info('WebSocket already connected');
      return Promise.resolve();
    }

    if (this.isConnecting) {
      logger.info('WebSocket connection already in progress');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.isConnecting = true;
      let connectionRejected = false;

      try {
        logger.info(`Attempting WebSocket connection to ${this.url}`);
        this.ws = new WebSocket(this.url);

        // Set up error handler immediately (before other handlers)
        this.ws.onerror = (error) => {
          const errorDetails = {
            error,
            url: this.url,
            conversationId: this.conversationId,
            readyState: this.ws?.readyState,
            readyStateText: this.ws ? {
              0: 'CONNECTING',
              1: 'OPEN',
              2: 'CLOSING',
              3: 'CLOSED'
            }[this.ws.readyState] : 'UNKNOWN'
          };
          logger.error('WebSocket error', errorDetails);
          
          // Check if this is a connection error
          if (this.ws?.readyState === WebSocket.CLOSED || this.ws?.readyState === undefined) {
            connectionRejected = true;
            this.isConnecting = false;
            // Reject after a short delay to let onclose fire first
            setTimeout(() => {
              if (connectionRejected) {
                reject(new Error(`WebSocket connection failed: Unable to connect to ${this.url}. Is the server running?`));
              }
            }, 100);
          }
        };

        this.ws.onopen = () => {
          logger.info('WebSocket connected', { conversationId: this.conversationId, url: this.url });
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          connectionRejected = false;
          // Emit 'connected' event for handlers
          this.handleMessage({ type: 'connected', data: { conversationId: this.conversationId } });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            logger.error('Error parsing WebSocket message', error);
          }
        };

        this.ws.onclose = (event) => {
          logger.info('WebSocket closed', { 
            code: event.code, 
            reason: event.reason,
            wasClean: event.wasClean,
            url: this.url
          });
          this.isConnecting = false;
          this.ws = null;

          // Reject the promise if connection failed (not clean close)
          if (!event.wasClean && event.code !== 1000 && !connectionRejected) {
            connectionRejected = true;
            const errorMsg = event.code === 1006 
              ? `WebSocket connection failed: Connection closed abnormally. Is the server running at ${this.url}?`
              : `WebSocket connection failed: ${event.code} ${event.reason || 'Unknown error'}`;
            reject(new Error(errorMsg));
          }

          // Attempt to reconnect if not intentionally closed
          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts && event.code !== 1000 && !connectionRejected) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => {
              this.connect().catch((err) => {
                logger.error('Reconnection failed', err);
              });
            }, delay);
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.eventHandlers.clear();
  }

  /**
   * Send message to server
   */
  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      logger.warn('WebSocket not connected, cannot send message');
    }
  }

  /**
   * Register event handler
   */
  on(eventType: string, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)?.add(handler);
  }

  /**
   * Unregister event handler
   */
  off(eventType: string, handler: WebSocketEventHandler): void {
    this.eventHandlers.get(eventType)?.delete(handler);
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: WebSocketMessage): void {
    // Call handlers for specific event type
    const handlers = this.eventHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          logger.error('Error in WebSocket event handler', error);
        }
      });
    }

    // Also call handlers for 'message' (catch-all)
    const catchAllHandlers = this.eventHandlers.get('message');
    if (catchAllHandlers) {
      catchAllHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          logger.error('Error in WebSocket catch-all handler', error);
        }
      });
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
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

// Use imported logger
const logger = logUtil;

export default WebSocketService;

