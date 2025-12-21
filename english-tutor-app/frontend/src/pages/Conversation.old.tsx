/**
 * Conversation Page - Main conversation interface
 * Uses WebSocket for real-time chunk updates
 */
import { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Loader2, Wifi, WifiOff } from 'lucide-react';
import { useConversationStore } from '../store/useConversationStore';
import { useAudioStore } from '../store/useAudioStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { chatWithTutor } from '../services/ollamaApi';
import { getAudioFile } from '../services/ttsApi';
import { transcribeAudio } from '../services/sttApi';
import WebSocketService, { type WebSocketMessage } from '../services/websocketService';
import { logger } from '../utils/logger';

export default function Conversation(): JSX.Element {
  const { messages, isLoading, error, addMessage, updateMessage, setLoading, setError, clearConversation, sessionId, setSessionId } = useConversationStore();
  const { isRecording, startRecording, stopRecording, playAudio } = useAudioStore();
  const { selectedVoice } = useSettingsStore();
  const [inputText, setInputText] = useState('');
  const [playingChunkId, setPlayingChunkId] = useState<string | null>(null);
  // playingChunkId is used in the JSX below for highlighting
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocketService | null>(null);
  const chunkMessageMapRef = useRef<Map<string, string>>(new Map()); // chunk.id -> message.id
  // Speaker queue: stores audio ready to play (with metadata)
  const speakerQueueRef = useRef<Array<{ 
    messageId: string; 
    audioFileId: string; 
    pause?: number;
    speakerId?: string; // For future multi-speaker support
    audioBlob?: Blob; 
    audioUrl?: string;
    duration?: number;
  }>>([]);
  const isPlayingRef = useRef(false);
  const isQueueProcessorActiveRef = useRef(false); // Track if queue processor is running
  const audioCacheRef = useRef<Map<string, { blob: Blob; url: string }>>(new Map()); // Cache fetched audio

  // Initialize WebSocket connection
  useEffect(() => {
    // Prevent multiple connections
    if (wsRef.current) {
      logger.debug('WebSocket already initialized, skipping');
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:11200';
    const currentConversationId = sessionId ?? `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    if (!sessionId) {
      setSessionId(currentConversationId);
    }

    logger.info(`Initializing WebSocket for conversation ${currentConversationId}`);
    const ws = new WebSocketService(apiUrl, currentConversationId);
    wsRef.current = ws;

    // Setup event handlers
    ws.on('connected', () => {
      logger.info('WebSocket connected event received');
      setWsConnected(true);
    });

    ws.on('conversation-start', (message: WebSocketMessage) => {
      logger.info('Conversation started via WebSocket', message);
      const data = message.data as { chunks: Array<{ id?: string; text: string; icon?: string; emotion?: string; ttsStatus?: string }> };
      
      if (data.chunks) {
        // Don't clear the map - we might have existing mappings
        // Only clear if this is a new conversation (no existing messages for these chunks)
        const existingChunkIds = Array.from(chunkMessageMapRef.current.keys());
        const newChunkIds = data.chunks.map(c => c.id).filter(Boolean) as string[];
        const hasOverlap = newChunkIds.some(id => existingChunkIds.includes(id));
        
        if (!hasOverlap) {
          chunkMessageMapRef.current.clear();
          logger.info('Cleared chunk mapping for new conversation');
        }
        
        logger.info(`Received ${data.chunks.length} chunks in conversation-start`, { 
          chunkIds: data.chunks.map(c => c.id),
          existingMappings: existingChunkIds.length
        });
        
        data.chunks.forEach((chunk) => {
          const displayText = chunk.icon ? `${chunk.icon} ${chunk.text}` : chunk.text;
          
          // Check if we already have a mapping for this chunk
          let messageId = chunk.id ? chunkMessageMapRef.current.get(chunk.id) : undefined;
          
          if (!messageId) {
            // Add message to store first - it will generate the ID
            const actualMessageId = addMessage({
              role: 'assistant',
              content: displayText,
              ...(chunk.icon && { icon: chunk.icon }),
              ttsStatus: (chunk.ttsStatus as 'pending' | 'processing' | 'completed' | 'failed') || 'pending',
            });
            
            // Use the actual ID returned from addMessage for mapping
            messageId = actualMessageId;
            
            if (chunk.id) {
              chunkMessageMapRef.current.set(chunk.id, messageId);
              logger.debug(`Mapped chunk ${chunk.id} to message ${messageId}`);
            } else {
              logger.warn('Chunk missing ID in conversation-start', chunk);
            }
            
            // Verify the message was added with the correct ID
            setTimeout(() => {
              const messages = useConversationStore.getState().messages;
              const addedMsg = messages.find(m => m.id === messageId);
              if (addedMsg) {
                logger.debug(`Verified message ${messageId} added to store for chunk ${chunk.id}`);
              } else {
                logger.error(`Message ${messageId} NOT found in store after addMessage! Available IDs:`, 
                  messages.map(m => m.id));
              }
            }, 50);
          } else {
            // Update existing message
            logger.debug(`Updating existing message ${messageId} for chunk ${chunk.id}`);
            updateMessage(messageId, {
              content: displayText,
              ...(chunk.icon && { icon: chunk.icon }),
              ttsStatus: (chunk.ttsStatus as 'pending' | 'processing' | 'completed' | 'failed') || 'pending',
            });
          }
        });
      }
    });

    ws.on('chunk-update', (message: WebSocketMessage) => {
      logger.debug('Chunk update received', message);
      const data = message.data as { chunkIndex: number; chunk: { id?: string; audioFileId?: string; duration?: number; ttsStatus?: string; ttsError?: string; pause?: number } };
      
      if (data.chunk?.id) {
        const messageId = chunkMessageMapRef.current.get(data.chunk.id);
        if (messageId) {
          logger.info(`Updating message ${messageId} for chunk ${data.chunk.id}`, { 
            ttsStatus: data.chunk.ttsStatus, 
            hasAudio: !!data.chunk.audioFileId,
            duration: data.chunk.duration
          });
          
          const updates = {
            ttsStatus: (data.chunk.ttsStatus as 'pending' | 'processing' | 'completed' | 'failed') || 'pending',
            ...(data.chunk.audioFileId && { audioFileId: data.chunk.audioFileId }),
            ...(data.chunk.duration !== undefined && { duration: data.chunk.duration }),
          };
          
          logger.debug(`Calling updateMessage with:`, { messageId, updates });
          updateMessage(messageId, updates);
          
          // Verify update worked (for debugging)
          const messages = useConversationStore.getState().messages;
          const updatedMsg = messages.find(m => m.id === messageId);
          if (updatedMsg) {
            logger.debug(`Message ${messageId} updated successfully`, { 
              ttsStatus: updatedMsg.ttsStatus,
              audioFileId: updatedMsg.audioFileId 
            });
          } else {
            logger.error(`Message ${messageId} not found after update!`);
          }

          // RECEIVED AUDIO EVENT: Chunk completed with audio
          // Just queue it and pre-fetch - don't start playback here
          if (data.chunk.ttsStatus === 'completed' && data.chunk.audioFileId) {
            const alreadyQueued = speakerQueueRef.current.some(item => item.messageId === messageId);
            if (!alreadyQueued) {
              logger.info(`📥 Received audio for chunk ${data.chunk.id} (message ${messageId}, audioFileId: ${data.chunk.audioFileId})`);
              
              // Get metadata from chunk
              const pause = data.chunk.pause ?? 0.5;
              const speakerId = selectedVoice || 'default'; // Use selected voice as speaker ID
              
              // Create queue item (audio will be fetched in background)
              const queueItem = {
                messageId,
                audioFileId: data.chunk.audioFileId,
                pause,
                speakerId,
                ...(data.chunk.duration !== undefined && { duration: data.chunk.duration }),
              };
              
              // Push to speaker queue
              speakerQueueRef.current.push(queueItem);
              
              // Pre-fetch audio in background (non-blocking, event-driven)
              const audioFileId = data.chunk.audioFileId;
              if (audioFileId) {
                void (async () => {
                  try {
                    logger.debug(`📥 Pre-fetching audio file ${audioFileId}...`);
                    const audioBlob = await getAudioFile(audioFileId);
                    const audioUrl = URL.createObjectURL(audioBlob);
                    
                    // Cache the audio
                    audioCacheRef.current.set(audioFileId, { blob: audioBlob, url: audioUrl });
                    
                    // Update queue item with pre-fetched audio
                    const queueItemIndex = speakerQueueRef.current.findIndex(item => item.messageId === messageId);
                    if (queueItemIndex !== -1) {
                      speakerQueueRef.current[queueItemIndex] = {
                        ...speakerQueueRef.current[queueItemIndex]!,
                        audioBlob,
                        audioUrl,
                      };
                    }
                    
                    logger.info(`✅ Audio pre-fetched for chunk ${data.chunk.id} (message ${messageId})`);
                    
                    // Wake up speaker queue processor (if not already running)
                    wakeUpSpeakerQueue();
                  } catch (error) {
                    logger.error(`❌ Failed to pre-fetch audio for chunk ${data.chunk.id}:`, error);
                  }
                })();
              }
              
              // Wake up speaker queue processor
              wakeUpSpeakerQueue();
            } else {
              logger.warn(`Audio already queued for chunk ${data.chunk.id}, skipping`);
            }
          }
        } else {
          logger.warn(`No message ID found for chunk ${data.chunk.id}`, { 
            availableChunkIds: Array.from(chunkMessageMapRef.current.keys()) 
          });
        }
      } else {
        logger.warn('Chunk update missing chunk ID', data);
      }
    });

    ws.on('chunk-complete', (message: WebSocketMessage) => {
      logger.debug('Chunk complete', message);
      const data = message.data as { chunkIndex: number; chunk: { id?: string; audioFileId?: string; duration?: number; ttsStatus?: string; pause?: number } };
      
      // Handle chunk-complete (same as chunk-update, but only queue audio if not already queued)
      if (data.chunk?.id) {
        const messageId = chunkMessageMapRef.current.get(data.chunk.id);
        if (messageId) {
          updateMessage(messageId, {
            ttsStatus: (data.chunk.ttsStatus as 'pending' | 'processing' | 'completed' | 'failed') || 'pending',
            ...(data.chunk.audioFileId && { audioFileId: data.chunk.audioFileId }),
            ...(data.chunk.duration !== undefined && { duration: data.chunk.duration }),
          });

          // RECEIVED AUDIO EVENT: Same as chunk-update handler
          if (data.chunk.ttsStatus === 'completed' && data.chunk.audioFileId) {
            const alreadyQueued = speakerQueueRef.current.some(item => item.messageId === messageId);
            if (!alreadyQueued) {
              logger.info(`📥 Received audio for chunk ${data.chunk.id} (message ${messageId}, audioFileId: ${data.chunk.audioFileId})`);
              
              const pause = data.chunk.pause ?? 0.5;
              const speakerId = selectedVoice || 'default';
              
              speakerQueueRef.current.push({
                messageId,
                audioFileId: data.chunk.audioFileId,
                pause,
                speakerId,
                ...(data.chunk.duration !== undefined && { duration: data.chunk.duration }),
              });
              
              // Pre-fetch and wake up queue
              const audioFileId = data.chunk.audioFileId;
              if (audioFileId) {
                void (async () => {
                  try {
                    const audioBlob = await getAudioFile(audioFileId);
                    const audioUrl = URL.createObjectURL(audioBlob);
                    audioCacheRef.current.set(audioFileId, { blob: audioBlob, url: audioUrl });
                    
                    const queueItemIndex = speakerQueueRef.current.findIndex(item => item.messageId === messageId);
                    if (queueItemIndex !== -1) {
                      speakerQueueRef.current[queueItemIndex] = {
                        ...speakerQueueRef.current[queueItemIndex]!,
                        audioBlob,
                        audioUrl,
                      };
                    }
                    wakeUpSpeakerQueue();
                  } catch (error) {
                    logger.error(`❌ Failed to pre-fetch audio:`, error);
                  }
                })();
              }
              
              wakeUpSpeakerQueue();
            }
          }
        }
      }
    });

    ws.on('chunk-failed', (message: WebSocketMessage) => {
      logger.warn('Chunk failed', message);
      const data = message.data as { chunkIndex: number; chunk: { id?: string; ttsError?: string } };
      
      if (data.chunk?.id) {
        const messageId = chunkMessageMapRef.current.get(data.chunk.id);
        if (messageId) {
          updateMessage(messageId, {
            ttsStatus: 'failed',
          });
        }
      }
    });

    // Connect to WebSocket with retry
    const connectWithRetry = async () => {
      try {
        await ws.connect();
        logger.info('WebSocket connected successfully');
      } catch (err) {
        logger.error('Failed to connect WebSocket', err);
        setWsConnected(false);
        // Show user-friendly error
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect to server';
        if (errorMessage.includes('server running')) {
          logger.warn('WebSocket server may not be running. Please check backend server.');
        }
      }
    };
    
    // Small delay to ensure component is mounted
    const connectTimeout = setTimeout(() => {
      connectWithRetry();
    }, 100);

    // Cleanup on unmount
    return () => {
      clearTimeout(connectTimeout);
      logger.info('Cleaning up WebSocket connection');
      ws.disconnect();
      wsRef.current = null;
    };
  }, [sessionId]); // Only depend on sessionId to prevent multiple connections

  // SPEAKER QUEUE EVENT: Wake up processor
  // This is called when new audio is added to the queue
  const wakeUpSpeakerQueue = () => {
    if (!isQueueProcessorActiveRef.current) {
      logger.debug('🔔 Waking up speaker queue processor');
      isQueueProcessorActiveRef.current = true;
      void processSpeakerQueue();
    }
  };

  // SPEAKER QUEUE EVENT: Process queue
  // This runs independently, processing one item at a time
  // Sleeps when queue is empty, wakes up when new audio is added
  const processSpeakerQueue = async () => {
    // If already playing, wait for current playback to finish
    if (isPlayingRef.current) {
      logger.debug('⏸️ Speaker queue: Already playing, waiting...');
      // Check again after a short delay
      setTimeout(() => {
        if (speakerQueueRef.current.length > 0) {
          void processSpeakerQueue();
        } else {
          isQueueProcessorActiveRef.current = false;
        }
      }, 100);
      return;
    }

    // If queue is empty, sleep
    if (speakerQueueRef.current.length === 0) {
      logger.debug('😴 Speaker queue: Empty, going to sleep');
      isQueueProcessorActiveRef.current = false;
      return;
    }

    // Get first item from queue (matching current speaker if needed)
    // For now, just get first item (future: filter by speakerId)
    const item = speakerQueueRef.current.shift();
    if (!item) {
      isQueueProcessorActiveRef.current = false;
      return;
    }

    // Mark as playing
    isPlayingRef.current = true;

    try {
      const currentMessageId = item.messageId;
      logger.info(`🎵 Speaker queue: Processing audio for message ${currentMessageId} (audioFileId: ${item.audioFileId})`);
      
      // Update play audio indicator
      setPlayingChunkId(currentMessageId);
      updateMessage(currentMessageId, { isPlaying: true });

      // Get audio URL - check pre-fetched, cache, or wait for pre-fetch
      let audioUrl: string | undefined;
      let needsCleanup = false;
      
      if (item.audioUrl && item.audioBlob) {
        // Fast path: pre-fetched and ready
        logger.info(`✅ Using pre-fetched audio from queue for message ${currentMessageId}`);
        audioUrl = item.audioUrl;
      } else {
        // Check cache
        let cached = audioCacheRef.current.get(item.audioFileId);
        if (cached) {
          logger.info(`✅ Using cached audio for message ${currentMessageId}`);
          audioUrl = cached.url;
        } else {
          // Wait for pre-fetch to complete (non-blocking wait)
          logger.info(`⏳ Waiting for audio pre-fetch for message ${currentMessageId} (max 1.5s)...`);
          const maxWaitTime = 1500;
          const checkInterval = 50;
          let waited = 0;
          let found = false;
          
          while (waited < maxWaitTime && !found) {
            cached = audioCacheRef.current.get(item.audioFileId);
            if (cached) {
              logger.info(`✅ Audio pre-fetched after ${waited}ms for message ${currentMessageId}`);
              audioUrl = cached.url;
              found = true;
              break;
            }
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
          }
          
          // Fallback: fetch now if still not ready
          if (!found) {
            logger.warn(`⚠️ Audio not ready after ${waited}ms, fetching for message ${currentMessageId}...`);
            const audioBlob = await getAudioFile(item.audioFileId);
            audioUrl = URL.createObjectURL(audioBlob);
            needsCleanup = true;
          }
        }
      }
      
      // Ensure audioUrl is set
      if (!audioUrl) {
        throw new Error(`Failed to get audio URL for message ${currentMessageId}`);
      }
      
      // Start play audio
      logger.info(`▶️ Starting audio playback for message ${currentMessageId}`);
      await playAudio(audioUrl);

      // Cleanup
      if (needsCleanup) {
        URL.revokeObjectURL(audioUrl);
      }
      audioCacheRef.current.delete(item.audioFileId);

      // Update indicator
      updateMessage(currentMessageId, { isPlaying: false });
      logger.info(`✅ Finished playback for message ${currentMessageId}`);

      // Wait for pause duration
      if (item.pause && item.pause > 0) {
        await new Promise((resolve) => setTimeout(resolve, item.pause! * 1000));
      }
    } catch (audioError) {
      logger.error('❌ Audio playback error', audioError);
      updateMessage(item.messageId, { ttsStatus: 'failed' });
    } finally {
      // Mark as not playing
      setPlayingChunkId(null);
      isPlayingRef.current = false;

      // Loop: Process next item in queue (if available)
      if (speakerQueueRef.current.length > 0) {
        // Continue processing queue
        setTimeout(() => {
          void processSpeakerQueue();
        }, 0);
      } else {
        // Queue empty - sleep
        logger.debug('😴 Speaker queue: All audio played, going to sleep');
        isQueueProcessorActiveRef.current = false;
      }
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Add user message
    addMessage({ role: 'user', content: text });

    setLoading(true);
    setError(null);

    try {
      const currentConversationId = sessionId ?? `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      if (!sessionId) {
        setSessionId(currentConversationId);
      }

      // Get response from Ollama with WebSocket mode
      const response = await chatWithTutor({
        message: text,
        conversationHistory: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        usePipeline: true,
        voice: selectedVoice || 'Ana Florence',
        conversationId: currentConversationId,
        useWebSocket: true, // Use WebSocket for real-time updates
      });

      if (response.success && response.data) {
        // If using WebSocket, chunks will arrive via WebSocket events
        // Just wait for the initial response
        if ((response.data as { conversationId?: string }).conversationId) {
          logger.info('Conversation started, waiting for WebSocket events');
          // Chunks will be added via WebSocket events
        } else if (response.data.chunks && response.data.chunks.length > 0) {
          // Fallback: HTTP mode (chunks in response)
          const chunks = response.data.chunks;
          chunks.forEach((chunk) => {
            const displayText = chunk.icon ? `${chunk.icon} ${chunk.text}` : chunk.text;
            addMessage({
              role: 'assistant',
              content: displayText,
              ...(chunk.icon && { icon: chunk.icon }),
              ttsStatus: chunk.ttsStatus || 'pending',
              ...(chunk.audioFileId && { audioFileId: chunk.audioFileId }),
              ...(chunk.duration !== undefined && { duration: chunk.duration }),
            });
          });
        } else if (response.data.response) {
          // Legacy mode: full response
          addMessage({ role: 'assistant', content: response.data.response });
        }
      } else {
        setError(response.error ?? 'Failed to get response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = async () => {
    if (isRecording) {
      // Stop recording
      try {
        const audioBlob = await stopRecording();
        
        setLoading(true);
        setError(null);

        // Transcribe audio
        const sttResponse = await transcribeAudio({
          audio: audioBlob,
          language: 'en',
        });

        if (sttResponse.success && sttResponse.data?.text) {
          const transcribedText = sttResponse.data.text;
          // Send transcribed text as message
          await handleSendMessage(transcribedText);
        } else {
          setError(sttResponse.error ?? 'Failed to transcribe audio');
          setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process audio');
        setLoading(false);
      }
    } else {
      // Start recording
      try {
        await startRecording();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start recording');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      handleSendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white rounded-lg shadow">
      {/* WebSocket Status Indicator */}
      <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {wsConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-600" />
              <span className="text-green-600">Real-time connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-gray-400" />
              <span className="text-gray-400">Connecting...</span>
            </>
          )}
        </div>
        {sessionId && (
          <span className="text-xs text-gray-500">Session: {sessionId.substring(0, 8)}...</span>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg mb-2">Start a conversation</p>
            <p className="text-sm">Type a message or use voice input to begin</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} ${
                message.role === 'assistant' && message.isPlaying && playingChunkId === message.id ? 'ring-2 ring-purple-400 rounded-lg' : ''
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  <p className="whitespace-pre-wrap flex-1">{message.content}</p>
                  {message.role === 'assistant' && (
                    <div className="flex flex-col items-center gap-1 mt-1 min-w-[80px]">
                      {/* TTS Status Indicator */}
                      {message.ttsStatus === 'pending' && (
                        <div className="flex items-center gap-1 text-xs text-gray-500" title="Audio pending">
                          <VolumeX className="h-3 w-3" />
                          <span>Pending</span>
                        </div>
                      )}
                      {message.ttsStatus === 'processing' && (
                        <div className="flex items-center gap-1 text-xs text-blue-600" title="Generating audio...">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Generating</span>
                        </div>
                      )}
                      {message.ttsStatus === 'completed' && !message.isPlaying && (
                        <div className="flex items-center gap-1 text-xs text-green-600" title="Audio ready">
                          <Volume2 className="h-3 w-3" />
                          <span>Ready</span>
                        </div>
                      )}
                      {message.isPlaying && (
                        <div className="flex items-center gap-1 text-xs text-purple-600 animate-pulse" title="Playing audio">
                          <Volume2 className="h-3 w-3" />
                          <span>Playing</span>
                        </div>
                      )}
                      {message.ttsStatus === 'failed' && (
                        <div className="flex items-center gap-1 text-xs text-red-600" title="Audio generation failed">
                          <VolumeX className="h-3 w-3" />
                          <span>Failed</span>
                        </div>
                      )}
                      {/* Duration indicator */}
                      {message.duration && message.ttsStatus === 'completed' && (
                        <span className="text-xs text-gray-400">
                          {message.duration.toFixed(1)}s
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs mt-1 opacity-70">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-700">
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <button
            type="button"
            onClick={handleVoiceInput}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isRecording
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
        <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
          <button
            onClick={clearConversation}
            className="hover:text-gray-700"
          >
            Clear conversation
          </button>
          <span>{isRecording ? 'Recording...' : 'Press mic to record'}</span>
        </div>
      </div>
    </div>
  );
}

