/**
 * Conversation Page - RxJS Refactored Version
 * Uses RxJS for event-driven architecture
 */
import { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { useConversationStore } from '../store/useConversationStore';
import { useAudioStore } from '../store/useAudioStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { chatWithTutor } from '../services/ollamaApi';
import { transcribeAudio } from '../services/sttApi';
import WebSocketRxService from '../services/websocketRxService';
import { eventBus } from '../services/eventBus';
import { audioQueueService } from '../services/audioQueueService';
import { logger } from '../utils/logger';
import { Subscription } from 'rxjs';
import { filter, tap } from 'rxjs/operators';

export default function Conversation(): JSX.Element {
  const { 
    messages, 
    isLoading, 
    error, 
    addMessage, 
    updateMessage, 
    setLoading, 
    setError, 
    sessionId, 
    setSessionId 
  } = useConversationStore();
  
  const { isRecording, startRecording, stopRecording } = useAudioStore();
  const { selectedVoice } = useSettingsStore();
  const [inputText, setInputText] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  
  const wsServiceRef = useRef<WebSocketRxService | null>(null);
  const subscriptionsRef = useRef<Subscription[]>([]);
  const chunkMessageMapRef = useRef<Map<string, string>>(new Map());

  // Initialize WebSocket and event subscriptions
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:11200';
    const currentConversationId = sessionId ?? `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    if (!sessionId) {
      setSessionId(currentConversationId);
    }

    logger.info(`Initializing WebSocket for conversation ${currentConversationId}`);
    const wsService = new WebSocketRxService({
      baseUrl: apiUrl,
      conversationId: currentConversationId,
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
    });
    wsServiceRef.current = wsService;

    // Subscribe to WebSocket connection state
    const connectionSub = wsService.connectionState$.subscribe(state => {
      setWsConnected(state === 'open');
      logger.debug('WebSocket state changed', { state });
    });

    // Subscribe to WebSocket errors
    const errorSub = wsService.errors$.subscribe(err => {
      logger.error('WebSocket error', err);
      setError(err.message);
    });

    // Connect WebSocket
    const connectSub = wsService.connect().subscribe({
      next: () => {
        logger.info('WebSocket connected successfully');
      },
      error: (err) => {
        logger.error('Failed to connect WebSocket', err);
        setError(err.message);
      },
    });

    // Subscribe to conversation:started events
    const conversationStartSub = eventBus.on<{
      messageId: string;
      chunks: Array<{
        id?: string;
        text: string;
        icon?: string;
        emotion?: string;
        ttsStatus?: string;
      }>;
      metadata?: unknown;
    }>('conversation:started').pipe(
      filter(event => event.conversationId === currentConversationId),
      tap(event => {
        logger.info('Conversation started via event bus', event);
        const data = event.data;
        
        if (data.chunks) {
          // Clear mapping if new conversation
          const existingChunkIds = Array.from(chunkMessageMapRef.current.keys());
          const newChunkIds = data.chunks.map(c => c.id).filter(Boolean) as string[];
          const hasOverlap = newChunkIds.some(id => existingChunkIds.includes(id));
          
          if (!hasOverlap) {
            chunkMessageMapRef.current.clear();
          }

          // Add messages for each chunk
          data.chunks.forEach((chunk) => {
            const displayText = chunk.icon ? `${chunk.icon} ${chunk.text}` : chunk.text;
            
            let messageId = chunk.id ? chunkMessageMapRef.current.get(chunk.id) : undefined;
            
            if (!messageId) {
              messageId = addMessage({
                role: 'assistant',
                content: displayText,
                ...(chunk.icon && { icon: chunk.icon }),
                ttsStatus: (chunk.ttsStatus as 'pending' | 'processing' | 'completed' | 'failed') || 'pending',
              });
              
              if (chunk.id) {
                chunkMessageMapRef.current.set(chunk.id, messageId);
              }
            }
          });
        }
      })
    ).subscribe();

    // Subscribe to chunk:tts-completed events
    const chunkCompleteSub = eventBus.on<{
      chunkIndex: number;
      chunk: {
        id?: string;
        audioFileId?: string;
        duration?: number;
        pause?: number;
        ttsStatus?: string;
      };
    }>('chunk:tts-completed').pipe(
      filter(event => event.conversationId === currentConversationId),
      tap(event => {
        const data = event.data;
        if (data.chunk?.id) {
          const messageId = chunkMessageMapRef.current.get(data.chunk.id);
          if (messageId) {
            updateMessage(messageId, {
              ttsStatus: (data.chunk.ttsStatus as 'pending' | 'processing' | 'completed' | 'failed') || 'completed',
              ...(data.chunk.audioFileId && { audioFileId: data.chunk.audioFileId }),
              ...(data.chunk.duration !== undefined && { duration: data.chunk.duration }),
            });

            // Queue audio for playback
            if (data.chunk.ttsStatus === 'completed' && data.chunk.audioFileId) {
              audioQueueService.queue({
                messageId,
                audioFileId: data.chunk.audioFileId,
                pause: data.chunk.pause ?? 0.5,
                speakerId: selectedVoice || 'default',
                ...(data.chunk.duration !== undefined && { duration: data.chunk.duration }),
              });
            }
          }
        }
      })
    ).subscribe();

    // Subscribe to chunk:tts-failed events
    const chunkFailedSub = eventBus.on<{
      chunkIndex: number;
      chunk: {
        id?: string;
        ttsError?: string;
      };
    }>('chunk:tts-failed').pipe(
      filter(event => event.conversationId === currentConversationId),
      tap(event => {
        const data = event.data;
        if (data.chunk?.id) {
          const messageId = chunkMessageMapRef.current.get(data.chunk.id);
          if (messageId) {
            updateMessage(messageId, {
              ttsStatus: 'failed',
            });
          }
        }
      })
    ).subscribe();

    // Subscribe to audio:ready events
    const audioReadySub = eventBus.on<{
      chunkIndex: number;
      chunkId: string;
      audioFileId: string;
      duration?: number;
    }>('audio:ready').pipe(
      filter(event => event.conversationId === currentConversationId),
      tap(event => {
        const data = event.data;
        const messageId = chunkMessageMapRef.current.get(data.chunkId);
        if (messageId) {
          updateMessage(messageId, {
            audioFileId: data.audioFileId,
            ...(data.duration !== undefined && { duration: data.duration }),
          });
        }
      })
    ).subscribe();

    // Start audio queue processing
    const audioQueueSub = audioQueueService.start().subscribe({
      error: (err) => {
        logger.error('Audio queue error', err);
      },
    });

    // Store all subscriptions
    subscriptionsRef.current = [
      connectionSub,
      errorSub,
      connectSub,
      conversationStartSub,
      chunkCompleteSub,
      chunkFailedSub,
      audioReadySub,
      audioQueueSub,
    ];

    // Cleanup on unmount
    return () => {
      logger.info('Cleaning up WebSocket and subscriptions');
      subscriptionsRef.current.forEach(sub => sub.unsubscribe());
      wsServiceRef.current?.disconnect();
      wsServiceRef.current = null;
      audioQueueService.clearCache();
    };
  }, [sessionId, addMessage, updateMessage, setError, setSessionId, selectedVoice]);

  // Handle send message
  const handleSendMessage = async (): Promise<void> => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    setLoading(true);
    setError(null);

    // Add user message
    addMessage({
      role: 'user',
      content: userMessage,
    });

    try {
      const conversationId = sessionId ?? `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      await chatWithTutor({
        message: userMessage,
        conversationId,
        useWebSocket: true,
        voice: selectedVoice,
      });

      logger.info('Message sent successfully');
    } catch (err) {
      logger.error('Failed to send message', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  // Handle voice input
  const handleVoiceInput = async (): Promise<void> => {
    if (isRecording) {
      try {
        const audioBlob = await stopRecording();
        const response = await transcribeAudio({ audio: audioBlob });
        
        if (response.success && response.data?.text) {
          setInputText(response.data.text);
          await handleSendMessage();
        }
      } catch (err) {
        logger.error('Voice input error', err);
        setError(err instanceof Error ? err.message : 'Voice input failed');
      }
    } else {
      try {
        await startRecording();
      } catch (err) {
        logger.error('Failed to start recording', err);
        setError(err instanceof Error ? err.message : 'Failed to start recording');
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">English Tutor</h1>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {wsConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            Start a conversation with your English tutor!
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {message.icon && <span>{message.icon}</span>}
                <p>{message.content}</p>
              </div>
              
              {message.role === 'assistant' && (
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  {message.ttsStatus === 'pending' && (
                    <span className="flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Pending
                    </span>
                  )}
                  {message.ttsStatus === 'processing' && (
                    <span className="flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Generating
                    </span>
                  )}
                  {message.ttsStatus === 'completed' && message.duration && (
                    <span className="flex items-center gap-1">
                      <Volume2 className="w-3 h-3" />
                      Ready {message.duration.toFixed(1)}s
                    </span>
                  )}
                  {message.ttsStatus === 'failed' && (
                    <span className="text-red-500">Failed</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-100 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleVoiceInput}
            className={`p-2 rounded-lg ${
              isRecording ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSendMessage();
              }
            }}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

