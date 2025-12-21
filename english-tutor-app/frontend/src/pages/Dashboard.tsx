/**
 * Dashboard Page
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, BookOpen, TrendingUp, CheckCircle } from 'lucide-react';
import { checkOllamaHealth } from '../services/ollamaApi';
import { checkTTSHealth } from '../services/ttsApi';
import { checkSTTHealth } from '../services/sttApi';

export default function Dashboard(): JSX.Element {
  const [servicesStatus, setServicesStatus] = useState<{
    ollama: boolean | null;
    tts: boolean | null;
    stt: boolean | null;
  }>({
    ollama: null,
    tts: null,
    stt: null,
  });

  useEffect(() => {
    // Check service health
    const checkServices = async () => {
      try {
        const [ollamaRes, ttsRes, sttRes] = await Promise.all([
          checkOllamaHealth().catch(() => ({ success: false, data: { available: false } })),
          checkTTSHealth().catch(() => ({ success: false, data: { available: false } })),
          checkSTTHealth().catch(() => ({ success: false, data: { available: false } })),
        ]);

        setServicesStatus({
          ollama: ollamaRes.success && ollamaRes.data?.available === true,
          tts: ttsRes.success && ttsRes.data?.available === true,
          stt: sttRes.success && sttRes.data?.available === true,
        });
      } catch (error) {
        console.error('Error checking services:', error);
      }
    };

    checkServices();
  }, []);

  const ServiceStatus = ({ name, available }: { name: string; available: boolean | null }) => {
    if (available === null) {
      return (
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-gray-400 animate-pulse" />
          <span className="text-sm text-gray-600">{name}: Checking...</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        {available ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600">{name}: Available</span>
          </>
        ) : (
          <>
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-sm text-red-600">{name}: Unavailable</span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to English Tutor</h1>
        <p className="text-lg text-gray-600">
          AI-powered English learning platform with conversation practice, grammar correction, and personalized exercises.
        </p>
      </div>

      {/* Services Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Status</h2>
        <div className="space-y-2">
          <ServiceStatus name="Ollama" available={servicesStatus.ollama} />
          <ServiceStatus name="TTS (Text-to-Speech)" available={servicesStatus.tts} />
          <ServiceStatus name="STT (Speech-to-Text)" available={servicesStatus.stt} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/conversation"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center space-x-3 mb-3">
            <MessageCircle className="h-8 w-8 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Start Conversation</h3>
          </div>
          <p className="text-gray-600">
            Practice English conversation with AI tutor. Use voice or text input.
          </p>
        </Link>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-3">
            <BookOpen className="h-8 w-8 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Lessons</h3>
          </div>
          <p className="text-gray-600">
            Structured lessons and exercises (Coming soon)
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-3">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Progress</h3>
          </div>
          <p className="text-gray-600">
            Track your learning progress (Coming soon)
          </p>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Getting Started</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Check that all services are available (green status above)</li>
          <li>Go to Conversation page to start practicing</li>
          <li>Use voice input for pronunciation practice</li>
          <li>Use text input for grammar correction</li>
          <li>Configure your preferred voice in Settings</li>
        </ol>
      </div>
    </div>
  );
}

