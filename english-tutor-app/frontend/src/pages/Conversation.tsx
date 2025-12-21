/**
 * Conversation Page - Main conversation interface
 */
import { useState } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';
import { useConversationStore } from '../store/useConversationStore';
import { useAudioStore } from '../store/useAudioStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { chatWithTutor } from '../services/ollamaApi';
import { synthesizeSpeech, getAudioFile } from '../services/ttsApi';
import { transcribeAudio } from '../services/sttApi';

export default function Conversation(): JSX.Element {
  const { messages, isLoading, error, addMessage, setLoading, setError, clearConversation } = useConversationStore();
  const { isRecording, startRecording, stopRecording, playAudio } = useAudioStore();
  const { selectedVoice } = useSettingsStore();
  const [inputText, setInputText] = useState('');

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Add user message
    addMessage({ role: 'user', content: text });

    setLoading(true);
    setError(null);

    try {
      // Get response from Ollama
      const response = await chatWithTutor({
        message: text,
        conversationHistory: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      if (response.success && response.data) {
        // Add assistant message
        addMessage({ role: 'assistant', content: response.data.response });

        // Generate TTS audio
        try {
          const ttsResponse = await synthesizeSpeech({
            text: response.data.response,
            voice: selectedVoice,
          });

          if (ttsResponse.success && ttsResponse.data?.fileId) {
            // Get audio file and play it
            const audioBlob = await getAudioFile(ttsResponse.data.fileId);
            const audioUrl = URL.createObjectURL(audioBlob);
            await playAudio(audioUrl);
          }
        } catch (ttsError) {
          console.error('TTS error:', ttsError);
          // Continue even if TTS fails
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
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
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

