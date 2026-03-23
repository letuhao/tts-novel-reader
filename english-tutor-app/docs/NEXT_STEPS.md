# Next Steps - Implementation Roadmap

**Date:** December 21, 2025  
**Current Status:** Phase 2 Complete ✅

---

## 🎯 Immediate Next Steps

### Phase 3: Frontend Core Integration (Priority 1)

The backend is complete and tested. Now we need to update the frontend to work with the new event-driven architecture.

#### 3.1 Update Frontend Authentication (Estimated: 2-3 hours)
**Why:** Backend now requires authentication for all conversation endpoints.

**Tasks:**
1. Create authentication context/hooks
   - `src/contexts/AuthContext.tsx`
   - `src/hooks/useAuth.ts`
   - Login state management
   - Token storage and refresh

2. Create login/register pages
   - `src/pages/Login.tsx`
   - `src/pages/Register.tsx`
   - Form validation
   - Error handling

3. Update routes with authentication
   - Protected route wrapper
   - Redirect to login if not authenticated
   - Update `App.tsx` routing

4. Update API services
   - Add auth token to requests
   - Handle 401 errors (logout)
   - Token refresh logic

**Files to Create/Update:**
- `frontend/src/contexts/AuthContext.tsx` (NEW)
- `frontend/src/hooks/useAuth.ts` (NEW)
- `frontend/src/pages/Login.tsx` (NEW)
- `frontend/src/pages/Register.tsx` (NEW)
- `frontend/src/services/authApi.ts` (NEW)
- `frontend/src/services/api.ts` (UPDATE - add auth headers)
- `frontend/src/App.tsx` (UPDATE - add auth routes)

---

#### 3.2 Update Conversation Component (Estimated: 3-4 hours)
**Why:** Backend API has changed significantly with new event-driven architecture.

**Tasks:**
1. Update WebSocket integration
   - Connect to new event types
   - Handle `conversation:started` event
   - Handle `chunk:tts-completed` event
   - Handle `audio:ready` event

2. Update conversation flow
   - Create conversation before sending message
   - Send `conversationId` with messages
   - Handle new response format

3. Update message display
   - Show chunks separately
   - Display TTS status
   - Show audio playback controls

4. Update state management
   - Conversation store updates
   - Message store updates
   - Audio store updates

**Files to Update:**
- `frontend/src/pages/Conversation.tsx` (MAJOR UPDATE)
- `frontend/src/services/websocketService.ts` (UPDATE)
- `frontend/src/services/ollamaApi.ts` (UPDATE)
- `frontend/src/store/useConversationStore.ts` (UPDATE)
- `frontend/src/store/useAudioStore.ts` (UPDATE)

**Key Changes:**
- Remove old chunk handling logic
- Add conversation creation
- Update WebSocket event handlers
- Use new event types from backend

---

#### 3.3 Conversation List View (Estimated: 2-3 hours)
**Why:** Users need to see and manage their conversations.

**Tasks:**
1. Create conversation list component
   - `src/pages/Conversations.tsx`
   - List all user conversations
   - Show conversation title, last message, timestamp
   - Click to open conversation

2. Create conversation API service
   - `src/services/conversationApi.ts`
   - Get all conversations
   - Get conversation by ID
   - Create new conversation
   - Delete conversation

3. Add navigation
   - Link from conversation list to detail
   - Link from detail back to list
   - New conversation button

**Files to Create:**
- `frontend/src/pages/Conversations.tsx` (NEW)
- `frontend/src/services/conversationApi.ts` (NEW)
- `frontend/src/components/ConversationCard.tsx` (NEW)

---

### Phase 4: Polish & Advanced Features (Priority 2)

#### 4.1 Error Handling & Loading States (Estimated: 2 hours)
- Loading spinners
- Error messages
- Retry logic
- Network error handling

#### 4.2 UI/UX Improvements (Estimated: 3-4 hours)
- Better message bubbles
- Typing indicators
- Audio waveform visualization
- Responsive design

#### 4.3 Learning Features UI (Estimated: 4-5 hours)
- Grammar correction display
- Vocabulary tracking
- Progress dashboard
- Statistics view

---

## 📋 Detailed Implementation Plan

### Step 1: Authentication (Start Here)

```typescript
// 1. Create AuthContext
// frontend/src/contexts/AuthContext.tsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  const login = async (email, password) => {
    // Call /api/auth/login
    // Store token
    // Set user
  };
  
  const logout = () => {
    // Clear token
    // Clear user
    // Redirect to login
  };
  
  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 2. Create useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// 3. Update API service to include token
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

### Step 2: Update Conversation Component

```typescript
// Key changes in Conversation.tsx:

// 1. Create conversation first
const conversation = await conversationApi.create({
  title: 'New Conversation',
  level: 'A1',
});

// 2. Update WebSocket connection
const ws = new WebSocket(`ws://localhost:11200/ws?conversationId=${conversation.id}`);

// 3. Handle new event types
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'conversation:started':
      // Handle conversation start
      break;
    case 'chunk:tts-completed':
      // Handle TTS completion
      break;
    case 'audio:ready':
      // Handle audio ready
      break;
  }
};

// 4. Send message with conversationId
await ollamaApi.chat({
  message: userMessage,
  conversationId: conversation.id,
  useWebSocket: true,
});
```

### Step 3: Conversation List

```typescript
// frontend/src/pages/Conversations.tsx
const Conversations = () => {
  const [conversations, setConversations] = useState([]);
  
  useEffect(() => {
    loadConversations();
  }, []);
  
  const loadConversations = async () => {
    const data = await conversationApi.getAll();
    setConversations(data);
  };
  
  return (
    <div>
      {conversations.map(conv => (
        <ConversationCard
          key={conv.id}
          conversation={conv}
          onClick={() => navigate(`/conversation/${conv.id}`)}
        />
      ))}
    </div>
  );
};
```

---

## 🚀 Quick Start Guide

### To Start Phase 3:

1. **Begin with Authentication**
   ```bash
   # Create auth context and hooks
   # Create login/register pages
   # Update API service
   ```

2. **Update Conversation Component**
   ```bash
   # Update WebSocket integration
   # Update message handling
   # Update state management
   ```

3. **Add Conversation List**
   ```bash
   # Create conversations page
   # Create conversation API
   # Add navigation
   ```

---

## 📊 Estimated Timeline

### Phase 3: Frontend Core
- **Authentication:** 2-3 hours
- **Conversation Update:** 3-4 hours
- **Conversation List:** 2-3 hours
- **Testing & Bug Fixes:** 2-3 hours
- **Total:** ~10-13 hours

### Phase 4: Polish
- **Error Handling:** 2 hours
- **UI/UX:** 3-4 hours
- **Learning Features:** 4-5 hours
- **Total:** ~9-11 hours

---

## 🎯 Success Criteria

### Phase 3 Complete When:
- ✅ User can register and login
- ✅ User can create new conversation
- ✅ User can send messages
- ✅ User can see assistant responses
- ✅ Audio plays correctly
- ✅ WebSocket events work
- ✅ User can see conversation list
- ✅ User can switch between conversations

---

## 📝 Notes

- Backend is production-ready
- All tests passing
- Type-safe throughout
- Event-driven architecture working
- Frontend needs update to match new backend API

---

**Ready to start Phase 3?** Begin with authentication implementation!
