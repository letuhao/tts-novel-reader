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
}

interface ConversationState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
  
  // Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
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
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
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

