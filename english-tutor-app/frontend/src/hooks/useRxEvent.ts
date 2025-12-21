/**
 * React Hook for RxJS Event Subscription
 * Simplifies subscribing to events in React components
 */
import { useEffect } from 'react';
import { Observable } from 'rxjs';
import { eventBus } from '../services/eventBus';
import type { Event } from '../services/eventBus';

/**
 * Subscribe to events of a specific type
 */
export function useRxEvent<T = unknown>(
  eventType: string,
  handler: (event: Event<T>) => void,
  deps: unknown[] = []
): void {
  useEffect(() => {
    const subscription = eventBus.on<T>(eventType).subscribe(handler);
    return () => subscription.unsubscribe();
  }, [eventType, ...deps]);
}

/**
 * Subscribe to events for a specific conversation
 */
export function useRxConversationEvent<T = unknown>(
  eventType: string,
  conversationId: string | null,
  handler: (event: Event<T>) => void,
  deps: unknown[] = []
): void {
  useEffect(() => {
    if (!conversationId) return;

    const subscription = eventBus.onConversation<T>(eventType, conversationId).subscribe(handler);
    return () => subscription.unsubscribe();
  }, [eventType, conversationId, ...deps]);
}

/**
 * Subscribe to any RxJS Observable
 */
export function useRxObservable<T>(
  observable: Observable<T> | null,
  handler: (value: T) => void,
  deps: unknown[] = []
): void {
  useEffect(() => {
    if (!observable) return;

    const subscription = observable.subscribe(handler);
    return () => subscription.unsubscribe();
  }, [observable, ...deps]);
}

