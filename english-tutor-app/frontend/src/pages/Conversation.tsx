/**
 * Conversation Page - RxJS-based Event-Driven Architecture
 * Uses RxJS for reactive event handling and audio queue management
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Mic, MicOff, Loader2, Moon, Sun } from 'lucide-react';
import MessageBubble from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import { useDarkMode } from '../hooks/useDarkMode';
import { useConversationStore } from '../store/useConversationStore';
import { useAudioStore } from '../store/useAudioStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuth } from '../hooks/useAuth';
import { chatWithTutor } from '../services/ollamaApi';
import { transcribeAudio } from '../services/sttApi';
import { getConversation, getConversationMessages } from '../services/conversationApi';
import type { MessageWithChunks } from '../services/conversationApi';
import WebSocketRxService from '../services/websocketRxService';
import { eventBus } from '../services/eventBus';
import { audioQueueService } from '../services/audioQueueService';
import { logger, setConversationStartTime, clearConversationStartTime } from '../utils/logger';
import { formatErrorMessage, retry } from '../utils/errorHandler';
import { Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';

export default function Conversation(): JSX.Element {
  const { id: conversationIdFromUrl } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { 
    messages, 
    isLoading, 
    error, 
    addMessage, 
    updateMessage, 
    setLoading, 
    setError, 
    setSessionId,
    clearConversation
  } = useConversationStore();
  
  const { isRecording, startRecording, stopRecording } = useAudioStore();
  const { selectedVoice } = useSettingsStore();
  const [inputText, setInputText] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(conversationIdFromUrl || null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [darkMode, setDarkMode] = useDarkMode();
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  
  const wsServiceRef = useRef<WebSocketRxService | null>(null);
  const subscriptionsRef = useRef<Subscription[]>([]);
  const chunkMessageMapRef = useRef<Map<string, string>>(new Map());
  const isInitializingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Load conversation from URL (only load, never create)
  useEffect(() => {
    // Prevent duplicate initialization
    if (isInitializingRef.current) {
      logger.debug('Skipping duplicate conversation initialization - already in progress');
      return;
    }

    // If we already have a conversationId and it matches the URL, skip
    if (hasInitializedRef.current && conversationId && conversationId === conversationIdFromUrl) {
      logger.debug('Conversation already initialized', { conversationId });
      return;
    }

    // If no conversationId in URL, redirect to conversations list
    if (!conversationIdFromUrl) {
      logger.debug('No conversationId in URL, redirecting to conversations list');
      navigate('/conversations');
      return;
    }

    const loadConversation = async (): Promise<void> => {
      if (isInitializingRef.current) {
        logger.debug('Conversation loading already in progress');
        return;
      }

      try {
        isInitializingRef.current = true;
        setIsInitializing(true);
        
        // Load conversation from URL
        const response = await getConversation(conversationIdFromUrl);
        if (response.success && response.data) {
          setConversationId(response.data.id);
          setSessionId(response.data.id);
          
          // Load existing messages
          await loadMessageHistory(response.data.id);
          hasInitializedRef.current = true;
        } else {
          // Conversation not found, redirect to conversations list
          logger.warn('Conversation not found', { id: conversationIdFromUrl });
          setError('Conversation not found');
          navigate('/conversations');
        }
      } catch (err) {
        logger.error('Error loading conversation', err instanceof Error ? err : { error: String(err) });
        setError(err instanceof Error ? err.message : 'Failed to load conversation');
        hasInitializedRef.current = false; // Allow retry on error
      } finally {
        isInitializingRef.current = false;
        setIsInitializing(false);
      }
    };

    const loadMessageHistory = async (convId: string): Promise<void> => {
      try {
        const response = await getConversationMessages(convId);
        if (response.success && response.data?.messages) {
          // Clear existing messages
          clearConversation();
          
          // Load messages with chunks
          response.data.messages.forEach((msg: MessageWithChunks) => {
            if (msg.role === 'user') {
              // Add user message
              addMessage({
                role: 'user',
                content: msg.content,
              });
            } else if (msg.role === 'assistant' && msg.chunks) {
              // Add assistant message chunks
              msg.chunks.forEach((chunk) => {
                const displayText = chunk.icon ? `${chunk.icon} ${chunk.text}` : chunk.text;
                const messageId = addMessage({
                  role: 'assistant',
                  content: displayText,
                  ...(chunk.icon && { icon: chunk.icon }),
                  ttsStatus: chunk.ttsStatus || 'completed',
                  ...(chunk.audioFileId && { audioFileId: chunk.audioFileId }),
                  ...(chunk.audioDuration !== undefined && { duration: chunk.audioDuration }),
                });
                
                // Map chunk ID to message ID for future updates
                if (chunk.id) {
                  chunkMessageMapRef.current.set(chunk.id, messageId);
                }
              });
            }
          });
          
          logger.info('Message history loaded', { 
            messageCount: response.data.messages.length 
          });
        }
      } catch (err) {
        logger.error('Error loading message history', err instanceof Error ? err : { error: String(err) });
        // Don't throw - allow conversation to continue without history
      }
    };

    if (user) {
      void loadConversation();
    }

    // Reset initialization flag when conversationIdFromUrl changes
    return () => {
      // Only reset if conversationIdFromUrl actually changed
      // This allows re-initialization when navigating to a different conversation
      if (conversationIdFromUrl !== conversationId) {
        hasInitializedRef.current = false;
      }
      isInitializingRef.current = false;
    };
  }, [conversationIdFromUrl, user, conversationId, navigate]); // Only load, never create

  // Initialize WebSocket and event subscriptions
  useEffect(() => {
    if (!conversationId || isInitializing) {
      // Clean up any existing connection if conversationId is not ready
      if (wsServiceRef.current) {
        logger.info('Cleaning up WebSocket - conversation not ready');
        // Don't disconnect here - just clear the ref, let cleanup handle it
        wsServiceRef.current = null;
      }
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:11200';

    logger.info(`Initializing WebSocket for conversation ${conversationId}`);
    
    // Set conversation start time for timeline tracking
    setConversationStartTime();
    
    const wsService = new WebSocketRxService({
      baseUrl: apiUrl,
      conversationId,
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
    const conversationStartSub = eventBus.onConversation<{
      messageId: string;
      chunksCount?: number;
      metadata?: unknown;
      source?: string;
    }>('conversation:started', conversationId).pipe(
      tap(event => {
        logger.info('Conversation started via event bus', {
          type: event.type,
          conversationId: event.conversationId,
          timestamp: event.timestamp,
          data: event.data,
        });
        // Reset audio queue for new conversation to ensure correct ordering
        audioQueueService.reset();
        logger.info('Audio queue reset for new conversation');
        // Note: chunks are not included in conversation:started event
        // They will be added via chunk:created events
      })
    ).subscribe();

    // Subscribe to chunk:created events to populate the chunk message map
    const chunkCreatedSub = eventBus.onConversation<{
      chunkIndex: number;
      chunk: {
        id?: string;
        text?: string;
        icon?: string;
        emotion?: string;
        ttsStatus?: string;
      };
    }>('chunk:created', conversationId).pipe(
      tap(event => {
        logger.info('Received chunk:created event', { 
          eventType: event.type,
          conversationId: event.conversationId,
          chunkId: (event.data as any)?.chunk?.id
        });
        
        const data = event.data as {
          chunkIndex: number;
          chunk: {
            id?: string;
            text?: string;
            icon?: string;
            emotion?: string;
            ttsStatus?: string;
          };
        };
        
        if (data?.chunk?.id && data?.chunk?.text) {
          // Check if we already have this chunk mapped
          if (!chunkMessageMapRef.current.has(data.chunk.id)) {
            const displayText = data.chunk.icon ? `${data.chunk.icon} ${data.chunk.text}` : data.chunk.text;
            
            const messageId = addMessage({
              role: 'assistant',
              content: displayText,
              ...(data.chunk.icon && { icon: data.chunk.icon }),
              ttsStatus: (data.chunk.ttsStatus as 'pending' | 'processing' | 'completed' | 'failed') || 'pending',
            });
            
            chunkMessageMapRef.current.set(data.chunk.id, messageId);
            
            logger.info('Created message for chunk', { 
              chunkId: data.chunk.id,
              messageId,
              chunkMapSize: chunkMessageMapRef.current.size
            });
          } else {
            logger.debug('Chunk already mapped', { 
              chunkId: data.chunk.id,
              messageId: chunkMessageMapRef.current.get(data.chunk.id)
            });
          }
        } else {
          logger.warn('chunk:created event missing required fields', { 
            hasChunkId: !!data?.chunk?.id,
            hasText: !!data?.chunk?.text
          });
        }
      })
    ).subscribe();

    // Subscribe to chunk:tts-completed events
    const chunkCompleteSub = eventBus.onConversation<{
      chunkIndex: number;
      chunk: {
        id?: string;
        audioFileId?: string;
        duration?: number;
        pause?: number;
        ttsStatus?: string;
        text?: string;
        emotion?: string;
        icon?: string;
        emphasis?: boolean;
        audioUrl?: string;
        ttsError?: string;
      };
    }>('chunk:tts-completed', conversationId).pipe(
      tap(event => {
        logger.info('Received chunk:tts-completed event', { 
          eventType: event.type,
          conversationId: event.conversationId,
          data: JSON.stringify(event.data, null, 2)
        });
        
        const data = event.data as {
          chunkIndex: number;
          chunk: {
            id?: string;
            audioFileId?: string;
            duration?: number;
            pause?: number;
            ttsStatus?: string;
          };
        };
        
        if (data?.chunk?.id) {
          const messageId = chunkMessageMapRef.current.get(data.chunk.id);
          logger.debug('Looking up message for chunk', { 
            chunkId: data.chunk.id, 
            messageId,
            chunkMapSize: chunkMessageMapRef.current.size,
            allChunkIds: Array.from(chunkMessageMapRef.current.keys())
          });
          
          if (messageId) {
            logger.info('Updating message with TTS completion', { 
              messageId,
              audioFileId: data.chunk.audioFileId,
              duration: data.chunk.duration 
            });
            
            updateMessage(messageId, {
              ttsStatus: (data.chunk.ttsStatus as 'pending' | 'processing' | 'completed' | 'failed') || 'completed',
              ...(data.chunk.audioFileId && { audioFileId: data.chunk.audioFileId }),
              ...(data.chunk.duration !== undefined && { duration: data.chunk.duration }),
            });

            // Queue audio for playback (audio data comes from WebSocket)
            if (data.chunk.ttsStatus === 'completed' || !data.chunk.ttsStatus) {
              const chunkData = data.chunk as any; // Type assertion for audioData
              logger.info('Queueing audio for playback', { 
                messageId,
                audioFileId: chunkData.audioFileId,
                hasAudioData: !!chunkData.audioData 
              });
              
              audioQueueService.queue({
                messageId,
                chunkIndex: data.chunkIndex, // Add chunkIndex for ordering
                ...(chunkData.audioFileId && { audioFileId: chunkData.audioFileId }),
                ...(chunkData.audioData && { audioData: chunkData.audioData }),
                pause: chunkData.pause ?? 0.5,
                speakerId: selectedVoice || 'default',
                ...(chunkData.duration !== undefined && { duration: chunkData.duration }),
                onPlayStart: () => {
                  setPlayingMessageId(messageId);
                },
                onPlayEnd: () => {
                  setPlayingMessageId(null);
                },
              });
            }
          } else {
            logger.warn('No message found for chunk', { 
              chunkId: data.chunk.id,
              availableChunkIds: Array.from(chunkMessageMapRef.current.keys())
            });
          }
        } else {
          logger.warn('chunk:tts-completed event missing chunk.id', { 
            data: JSON.stringify(data, null, 2),
            hasData: !!data,
            hasChunk: !!data?.chunk,
            chunkId: data?.chunk?.id
          });
        }
      })
    ).subscribe();

    // Subscribe to chunk:tts-failed events
    const chunkFailedSub = eventBus.onConversation<{
      chunkIndex: number;
      chunk: {
        id?: string;
        ttsError?: string;
      };
    }>('chunk:tts-failed', conversationId).pipe(
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
    const audioReadySub = eventBus.onConversation<{
      chunkIndex: number;
      chunkId: string;
      audioFileId: string;
      duration?: number;
    }>('audio:ready', conversationId).pipe(
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
      chunkCreatedSub,
      chunkCompleteSub,
      chunkFailedSub,
      audioReadySub,
      audioQueueSub,
    ];

    // Cleanup on unmount or dependency change
    return () => {
      logger.info('Cleaning up WebSocket and subscriptions');
      
      // Clear conversation start time
      clearConversationStartTime();
      
      // Unsubscribe from all RxJS subscriptions
      subscriptionsRef.current.forEach(sub => {
        if (!sub.closed) {
          sub.unsubscribe();
        }
      });
      subscriptionsRef.current = [];
      
      // Disconnect WebSocket if it exists
      if (wsServiceRef.current) {
        // Check WebSocket state before disconnecting
        const ws = (wsServiceRef.current as any).ws;
        if (ws) {
          const readyState = ws.readyState;
          if (readyState === WebSocket.CONNECTING || readyState === WebSocket.OPEN) {
            // Only disconnect if actually connected or connecting
            // Set handlers to null to prevent error logging
            ws.onclose = null;
            ws.onerror = null;
            wsServiceRef.current.disconnect();
          }
        }
        wsServiceRef.current = null;
      }
      
      // Clear audio cache
      audioQueueService.clearCache();
    };
  }, [conversationId, isInitializing]); // Only depend on conversationId and isInitializing - store functions are stable

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

    if (!conversationId) {
      setError('Conversation not initialized');
      return;
    }

    try {
      await retry(
        () => chatWithTutor({
          message: userMessage,
          conversationId,
          useWebSocket: true,
          voice: selectedVoice,
        }),
        {
          maxRetries: 2,
          retryDelay: 1000,
        }
      );

      logger.info('Message sent successfully');
    } catch (err) {
      logger.error('Failed to send message', err instanceof Error ? err : { error: String(err) });
      setError(formatErrorMessage(err));
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
        logger.error('Voice input error', err instanceof Error ? err : { error: String(err) });
        setError(formatErrorMessage(err));
      }
    } else {
      try {
        await startRecording();
      } catch (err) {
        logger.error('Failed to start recording', err instanceof Error ? err : { error: String(err) });
        setError(formatErrorMessage(err));
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/conversations')}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            ← Back
          </button>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">English Tutor</h1>
        </div>
        <div className="flex items-center gap-3">
          {isInitializing && (
            <span className="text-sm text-gray-500 dark:text-gray-400">Initializing...</span>
          )}
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {wsConnected ? 'Connected' : 'Disconnected'}
          </span>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-gray-50 dark:bg-gray-900">
        {isInitializing ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p>Loading conversation...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            Start a conversation with your English tutor!
          </div>
        ) : null}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isPlaying={playingMessageId === message.id}
          />
        ))}

        {isLoading && <TypingIndicator />}
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-sm border-t border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
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
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
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

