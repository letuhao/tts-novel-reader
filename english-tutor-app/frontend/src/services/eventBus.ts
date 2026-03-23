/**
 * RxJS-based Event Bus for Frontend
 * Centralized event system using RxJS Observables
 */
import { Subject, Observable, filter, share, map } from 'rxjs';
import { logger } from '../utils/logger';

export interface Event<T = unknown> {
  type: string;
  data: T;
  timestamp?: string;
  conversationId?: string;
}

class EventBus {
  private events$ = new Subject<Event>();
  private sharedEvents$ = this.events$.pipe(share());

  /**
   * Emit an event
   */
  emit<T = unknown>(event: Event<T>): void {
    const eventWithTimestamp: Event<T> = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    };
    
    logger.debug('Event emitted', { type: event.type, conversationId: event.conversationId });
    this.events$.next(eventWithTimestamp);
  }

  /**
   * Listen to events of a specific type
   */
  on<T = unknown>(eventType: string): Observable<Event<T>> {
    return this.sharedEvents$.pipe(
      filter(event => event.type === eventType),
      map(event => event as Event<T>)
    );
  }

  /**
   * Listen to all events
   */
  all(): Observable<Event> {
    return this.sharedEvents$;
  }

  /**
   * Listen to events for a specific conversation
   */
  conversation<T = unknown>(conversationId: string): Observable<Event<T>> {
    return this.sharedEvents$.pipe(
      filter(event => event.conversationId === conversationId),
      map(event => event as Event<T>)
    );
  }

  /**
   * Listen to events of a specific type for a specific conversation
   */
  onConversation<T = unknown>(eventType: string, conversationId: string): Observable<Event<T>> {
    return this.sharedEvents$.pipe(
      filter(event => event.type === eventType && event.conversationId === conversationId),
      map(event => event as Event<T>)
    );
  }
}

export const eventBus = new EventBus();

