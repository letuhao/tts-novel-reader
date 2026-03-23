/**
 * Settings Page
 */
import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { getVoices } from '../services/ttsApi';

export default function Settings(): JSX.Element {
  const { selectedVoice, selectedLanguage, playbackSpeed, voices, setVoice, setLanguage, setPlaybackSpeed, setVoices } = useSettingsStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load available voices
    const loadVoices = async () => {
      setIsLoading(true);
      try {
        const response = await getVoices();
        if (response.success && response.data?.voices) {
          setVoices(response.data.voices);
        }
      } catch (error) {
        console.error('Error loading voices:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVoices();
  }, [setVoices]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        {/* Voice Selection */}
        <div className="mb-6">
          <label htmlFor="voice" className="block text-sm font-medium text-gray-700 mb-2">
            Voice
          </label>
          {isLoading ? (
            <div className="text-sm text-gray-500">Loading voices...</div>
          ) : (
            <select
              id="voice"
              value={selectedVoice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {voices.map((voice) => (
                <option key={voice} value={voice}>
                  {voice}
                </option>
              ))}
            </select>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Select the voice for text-to-speech synthesis
          </p>
        </div>

        {/* Language Selection */}
        <div className="mb-6">
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
            Language
          </label>
          <select
            id="language"
            value={selectedLanguage}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Primary language for learning
          </p>
        </div>

        {/* Playback Speed */}
        <div className="mb-6">
          <label htmlFor="speed" className="block text-sm font-medium text-gray-700 mb-2">
            Playback Speed: {playbackSpeed.toFixed(1)}x
          </label>
          <input
            type="range"
            id="speed"
            min="0.5"
            max="2.0"
            step="0.1"
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.5x</span>
            <span>1.0x</span>
            <span>2.0x</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Adjust audio playback speed (Note: TTS doesn't support speed control yet)
          </p>
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">About Settings</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Voice selection affects TTS audio quality</li>
            <li>• Language setting affects STT transcription</li>
            <li>• Settings are stored locally in your browser</li>
            <li>• System settings can be changed by administrators</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

