/**
 * Conversation Store - Zustand store for conversation state
 */
import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
  icon?: string;
  ttsStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  audioFileId?: string;
  duration?: number;
  isPlaying?: boolean;
}

interface ConversationState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
  
  // Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string; // Returns the generated message ID
  updateLastMessage: (content: string) => void; // Update last message content
  updateMessage: (id: string, updates: Partial<Message>) => void; // Update specific message
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearConversation: () => void;
  setSessionId: (sessionId: string | null) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  messages: [],
  isLoading: false,
  error: null,
  sessionId: null,

  addMessage: (message) => {
    // Generate ID BEFORE creating message to ensure consistency
    const messageId = crypto.randomUUID();
    const newMessage: Message = {
      ...message,
      id: messageId,
      timestamp: new Date(),
    };
    set((state) => {
      const updatedMessages = [...state.messages, newMessage];
      console.log(`[useConversationStore] Added message ${messageId}`, {
        totalMessages: updatedMessages.length,
        messageIds: updatedMessages.map(m => m.id)
      });
      return { messages: updatedMessages };
    });
    // Return the ID so caller can use it
    return messageId;
  },

  updateLastMessage: (content) => {
    set((state) => {
      if (state.messages.length === 0) {
        return state;
      }
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        const updatedMessages = [...state.messages];
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMessage,
          content,
        };
        return { messages: updatedMessages };
      }
      return state;
    });
  },

  updateMessage: (id, updates) => {
    set((state) => {
      const messageIndex = state.messages.findIndex((msg) => msg.id === id);
      if (messageIndex === -1) {
        console.warn(`[useConversationStore] Message ${id} not found for update`, { 
          availableIds: state.messages.map(m => m.id),
          updates 
        });
        return state;
      }
      const updatedMessages = [...state.messages];
      const oldMessage = updatedMessages[messageIndex]!;
      updatedMessages[messageIndex] = {
        ...oldMessage,
        ...updates,
      };
      console.log(`[useConversationStore] Updated message ${id}`, {
        old: { ttsStatus: oldMessage.ttsStatus, audioFileId: oldMessage.audioFileId },
        new: { ttsStatus: updatedMessages[messageIndex]!.ttsStatus, audioFileId: updatedMessages[messageIndex]!.audioFileId },
        updates
      });
      return { messages: updatedMessages };
    });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  clearConversation: () => {
    set({
      messages: [],
      error: null,
      sessionId: null,
    });
  },

  setSessionId: (sessionId) => {
    set({ sessionId });
  },
}));

