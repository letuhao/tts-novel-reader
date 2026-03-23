# Frontend Tech Stack Evaluation for Event-Driven Architecture

**Date:** December 21, 2025  
**Status:** Evaluation Complete

---

## Current Tech Stack

### Core Libraries
- **React:** 18.3.1 ✅
- **Zustand:** 5.0.2 ✅
- **React Router:** 6.28.0 ✅
- **Axios:** 1.7.9 ✅
- **WebSocket:** Native API (custom wrapper) ✅
- **TypeScript:** 5.7.2 ✅
- **Vite:** 6.0.7 ✅
- **Tailwind CSS:** 3.4.17 ✅

---

## ✅ Strengths for Event-Driven Architecture

### 1. **React 18** - Excellent ✅
- ✅ **Concurrent Features:** React 18's concurrent rendering is perfect for event-driven updates
- ✅ **Hooks:** `useEffect`, `useState`, `useRef` work well with event streams
- ✅ **Automatic Re-renders:** State updates trigger re-renders automatically
- ✅ **Suspense:** Can be used for loading states during event processing

### 2. **Zustand** - Good, but needs enhancement ✅
- ✅ **Lightweight:** Minimal boilerplate
- ✅ **Fast:** No unnecessary re-renders
- ✅ **TypeScript Support:** Full type safety
- ⚠️ **Missing:** Built-in middleware for event handling
- ⚠️ **Missing:** Event subscription patterns

**Current Usage:**
```typescript
// Simple state updates - works but could be more event-driven
updateMessage: (id, updates) => {
  set((state) => {
    // Direct state mutation
  });
}
```

### 3. **WebSocket Service** - Good Foundation ✅
- ✅ **Event Handlers:** Already has `on/off` pattern
- ✅ **Reconnection Logic:** Handles connection failures
- ✅ **Type Safety:** TypeScript interfaces
- ⚠️ **Missing:** Event bus pattern for cross-component communication
- ⚠️ **Missing:** Event queuing for offline scenarios

**Current Implementation:**
```typescript
// Good: Event handler pattern
ws.on('conversation-start', (message) => {
  // Handle event
});
```

### 4. **TypeScript** - Excellent ✅
- ✅ **Type Safety:** Prevents runtime errors
- ✅ **Event Types:** Can define strict event interfaces
- ✅ **IntelliSense:** Better developer experience

---

## ⚠️ Areas for Improvement

### 1. **State Management Pattern**

**Current:** Direct state updates in components
```typescript
// Component directly updates store
updateMessage(chunkId, { ttsStatus: 'completed' });
```

**Better for Event-Driven:** Event-based state updates
```typescript
// Event handler updates store
eventBus.on('chunk:tts-completed', (event) => {
  updateMessage(event.chunkId, { ttsStatus: 'completed' });
});
```

### 2. **Event Bus Pattern**

**Current:** WebSocket events handled directly in components
```typescript
// Component handles WebSocket events
ws.on('conversation-start', (message) => {
  // Component logic
});
```

**Better:** Centralized event bus
```typescript
// Central event bus
eventBus.on('chunk:tts-completed', (event) => {
  // Update store
  // Trigger side effects
  // Update UI
});
```

### 3. **State Synchronization**

**Current:** Manual state updates
```typescript
// Manual updates scattered across components
updateMessage(id, { ttsStatus: 'completed' });
updateMessage(id, { audioFileId: 'audio-123' });
```

**Better:** Event-driven updates
```typescript
// Single event triggers all updates
eventBus.emit('chunk:tts-completed', {
  chunkId: id,
  audioFileId: 'audio-123',
  duration: 2.5
});
```

---

## 🎯 Recommendations

### Option 1: Enhance Current Stack (Recommended) ✅

**Why:** Minimal changes, leverages existing code

#### 1.1 Add Frontend Event Bus
```typescript
// frontend/src/services/eventBus.ts
class FrontendEventBus {
  private handlers = new Map<string, Set<Function>>();
  
  on(eventType: string, handler: Function) {
    // Register handler
  }
  
  emit(eventType: string, data: any) {
    // Emit event to all handlers
  }
  
  off(eventType: string, handler: Function) {
    // Unregister handler
  }
}
```

#### 1.2 Add Zustand Middleware for Events
```typescript
// frontend/src/store/middleware/eventMiddleware.ts
const eventMiddleware = (config) => (set, get, api) => {
  return config(
    (...args) => {
      // Emit events on state changes
      set(...args);
      eventBus.emit('state:updated', { ... });
    },
    get,
    api
  );
};
```

#### 1.3 Connect WebSocket to Event Bus
```typescript
// In WebSocketService
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  // Forward to event bus
  eventBus.emit(message.type, message.data);
};
```

**Benefits:**
- ✅ Minimal code changes
- ✅ Keeps existing Zustand stores
- ✅ Adds event-driven layer
- ✅ Easy to test

**Estimated Time:** 2-3 hours

---

### Option 2: Add RxJS (Advanced)

**Why:** More powerful event handling, but adds complexity

```typescript
// frontend/src/services/eventStream.ts
import { Subject, Observable } from 'rxjs';

class EventStream {
  private events = new Subject<Event>();
  
  emit(event: Event) {
    this.events.next(event);
  }
  
  on(eventType: string): Observable<Event> {
    return this.events.pipe(
      filter(e => e.type === eventType)
    );
  }
}
```

**Benefits:**
- ✅ Powerful operators (debounce, throttle, merge)
- ✅ Better for complex event flows
- ✅ Reactive programming paradigm

**Drawbacks:**
- ❌ Learning curve
- ❌ Additional dependency (~50KB)
- ❌ Overkill for current needs

**Estimated Time:** 4-6 hours

---

### Option 3: Use React Query + WebSocket (Alternative)

**Why:** Better data synchronization, but different paradigm

```typescript
// Using React Query for server state
const { data } = useQuery({
  queryKey: ['conversation', id],
  queryFn: () => fetchConversation(id),
});

// WebSocket for real-time updates
useWebSocket(`ws://...`, {
  onMessage: (event) => {
    queryClient.setQueryData(['conversation', id], (old) => {
      // Update with new data
    });
  }
});
```

**Benefits:**
- ✅ Automatic caching
- ✅ Background refetching
- ✅ Optimistic updates

**Drawbacks:**
- ❌ Different paradigm (server state vs client state)
- ❌ May not fit event-driven model well
- ❌ Additional dependency

**Estimated Time:** 6-8 hours

---

## ✅ Recommended Approach: Enhance Current Stack

### Implementation Plan

#### Step 1: Create Frontend Event Bus (1 hour)
```typescript
// frontend/src/services/eventBus.ts
export class FrontendEventBus {
  private handlers = new Map<string, Set<(data: any) => void>>();
  
  on(eventType: string, handler: (data: any) => void): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    
    // Return unsubscribe function
    return () => this.off(eventType, handler);
  }
  
  off(eventType: string, handler: (data: any) => void): void {
    this.handlers.get(eventType)?.delete(handler);
  }
  
  emit(eventType: string, data: any): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in event handler', error);
        }
      });
    }
  }
}

export const eventBus = new FrontendEventBus();
```

#### Step 2: Connect WebSocket to Event Bus (30 min)
```typescript
// Update WebSocketService
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  // Forward to event bus
  eventBus.emit(message.type, message.data);
};
```

#### Step 3: Update Stores to Listen to Events (1 hour)
```typescript
// In useConversationStore
useEffect(() => {
  const unsubscribe = eventBus.on('chunk:tts-completed', (data) => {
    updateMessage(data.chunkId, {
      ttsStatus: 'completed',
      audioFileId: data.audioFileId,
      duration: data.duration,
    });
  });
  
  return unsubscribe;
}, []);
```

#### Step 4: Update Components (1 hour)
```typescript
// In Conversation.tsx
useEffect(() => {
  // Subscribe to events
  const unsubscribes = [
    eventBus.on('conversation:started', handleConversationStart),
    eventBus.on('chunk:tts-completed', handleChunkComplete),
    eventBus.on('audio:ready', handleAudioReady),
  ];
  
  return () => {
    unsubscribes.forEach(unsub => unsub());
  };
}, []);
```

---

## 📊 Comparison

| Feature | Current | Enhanced | RxJS | React Query |
|---------|---------|----------|------|-------------|
| **Event Bus** | ❌ | ✅ | ✅ | ⚠️ |
| **Type Safety** | ✅ | ✅ | ✅ | ✅ |
| **Learning Curve** | Low | Low | Medium | Medium |
| **Bundle Size** | Small | Small | +50KB | +30KB |
| **Complexity** | Low | Low | Medium | Medium |
| **Event Operators** | ❌ | ⚠️ | ✅ | ⚠️ |
| **Time to Implement** | - | 2-3h | 4-6h | 6-8h |

---

## 🎯 Final Recommendation

### ✅ **Enhance Current Stack with Event Bus**

**Why:**
1. ✅ **Minimal Changes:** Works with existing code
2. ✅ **Type Safe:** Full TypeScript support
3. ✅ **Lightweight:** No additional dependencies
4. ✅ **Fast Implementation:** 2-3 hours
5. ✅ **Maintainable:** Simple, clear pattern
6. ✅ **Testable:** Easy to test event flows

**Implementation:**
- Add `FrontendEventBus` class
- Connect WebSocket to event bus
- Update stores to listen to events
- Update components to use event bus

**Result:**
- ✅ True event-driven architecture
- ✅ Decoupled components
- ✅ Centralized event handling
- ✅ Easy to extend

---

## 📝 Next Steps

1. **Create Event Bus** (`frontend/src/services/eventBus.ts`)
2. **Update WebSocket Service** to emit to event bus
3. **Update Stores** to subscribe to events
4. **Update Components** to use event bus
5. **Test** event flow end-to-end

---

**Conclusion:** Current tech stack is **suitable** for event-driven architecture with **minor enhancements**. No major changes needed! ✅

