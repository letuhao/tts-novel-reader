/**
 * TTS Service - Integration with TTS Backend
 * Dịch vụ TTS - Tích hợp với TTS Backend
 */
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export class TTSService {
  constructor(baseURL = 'http://127.0.0.1:11111') {
    this.baseURL = baseURL || process.env.TTS_BACKEND_URL || 'http://127.0.0.1:11111';
    this.defaultSpeaker = process.env.TTS_DEFAULT_SPEAKER || '05';
    this.defaultExpiryHours = parseInt(process.env.TTS_DEFAULT_EXPIRY_HOURS || '365');
    this.defaultModel = process.env.TTS_DEFAULT_MODEL || 'dia';
  }
  
  /**
   * Generate audio from text
   * Tạo audio từ text
   * 
   * @param {string} text - Text to generate
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Audio metadata with file ID
   */
  async generateAudio(text, options = {}) {
    const {
      speakerId = this.defaultSpeaker,
      model = this.defaultModel,
      expiryHours = this.defaultExpiryHours,
      temperature = 1.3,
      top_p = 0.95,
      cfg_scale = 3.0,
      speedFactor = 1.0,  // Normal speed to match preset (0.8-1.0, 1.0 = normal)
      store = true,
      returnAudio = false
    } = options;
    
    // Format text with speaker ID for Dia model
    let formattedText = text;
    if (model === 'dia' && !text.startsWith('[')) {
      formattedText = `[${speakerId}] ${text}`;
    }
    
    try {
      console.log(`[TTS Service] [generateAudio] Sending request to TTS backend...`);
      console.log(`[TTS Service] [generateAudio] Đang gửi yêu cầu tới TTS backend...`);
      console.log(`[TTS Service] [generateAudio] URL: ${this.baseURL}/api/tts/synthesize`);
      console.log(`[TTS Service] [generateAudio] Text length: ${formattedText.length} chars`);
      console.log(`[TTS Service] [generateAudio] Model: ${model}, Speaker: ${speakerId}`);
      
      const response = await axios.post(
        `${this.baseURL}/api/tts/synthesize`,
        {
          text: formattedText,
          model: model,
          temperature: temperature,
          top_p: top_p,
          cfg_scale: cfg_scale,
          speed_factor: speedFactor,  // Slower speech for better comprehension
          store: store,
          expiry_hours: expiryHours,
          return_audio: returnAudio
        },
        {
          timeout: 120000, // 2 minutes timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`[TTS Service] [generateAudio] ✅ Received response from TTS backend`);
      console.log(`[TTS Service] [generateAudio] ✅ Đã nhận phản hồi từ TTS backend`);
      console.log(`[TTS Service] [generateAudio] Status: ${response.status}`);
      console.log(`[TTS Service] [generateAudio] Headers:`, Object.keys(response.headers));
      
      // Extract file metadata from headers
      const fileId = response.headers['x-file-id'] || response.headers['X-File-Id'];
      const requestId = response.headers['x-request-id'] || response.headers['X-Request-Id'];
      const expiresAt = response.headers['x-expires-at'] || response.headers['X-Expires-At'];
      
      console.log(`[TTS Service] [generateAudio] File ID from headers: ${fileId || 'NOT FOUND ❌'}`);
      console.log(`[TTS Service] [generateAudio] Request ID: ${requestId || 'NOT FOUND'}`);
      console.log(`[TTS Service] [generateAudio] Expires At: ${expiresAt || 'NOT FOUND'}`);
      console.log(`[TTS Service] [generateAudio] Response body keys:`, response.data ? Object.keys(response.data) : 'NO BODY');
      
      // Check response body for file_metadata
      const bodyFileId = response.data?.file_metadata?.file_id;
      const bodyExpiresAt = response.data?.file_metadata?.expires_at;
      
      const finalFileId = fileId || bodyFileId;
      const finalExpiresAt = expiresAt || bodyExpiresAt;
      
      if (!finalFileId) {
        console.error(`[TTS Service] [generateAudio] ❌ CRITICAL: No file ID found in response!`);
        console.error(`[TTS Service] [generateAudio] ❌ QUAN TRỌNG: Không tìm thấy file ID trong phản hồi!`);
        console.error(`[TTS Service] [generateAudio] Headers:`, JSON.stringify(response.headers, null, 2));
        console.error(`[TTS Service] [generateAudio] Body:`, JSON.stringify(response.data, null, 2));
        throw new Error('TTS backend did not return a file ID. Check TTS backend logs.');
      }
      
      console.log(`[TTS Service] [generateAudio] ✅ Final File ID: ${finalFileId}`);
      console.log(`[TTS Service] [generateAudio] ✅ File ID cuối cùng: ${finalFileId}`);
      
      if (returnAudio) {
        // Return audio data if requested
        const result = {
          requestId: requestId || uuidv4(),
          fileId: finalFileId,
          audioData: response.data,
          expiresAt: finalExpiresAt
        };
        console.log(`[TTS Service] [generateAudio] ✅ Returning audio data`);
        return result;
      }
      
      // Return metadata from response body
      const result = {
        requestId: requestId || uuidv4(),
        fileId: finalFileId,
        metadata: response.data?.file_metadata || response.data,
        expiresAt: finalExpiresAt
      };
      console.log(`[TTS Service] [generateAudio] ✅ Returning metadata`);
      console.log(`[TTS Service] [generateAudio] Result:`, JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error(`[TTS Service] [generateAudio] ❌ ERROR occurred!`);
      console.error(`[TTS Service] [generateAudio] ❌ Đã xảy ra LỖI!`);
      console.error(`[TTS Service] [generateAudio] Error message: ${error.message}`);
      console.error(`[TTS Service] [generateAudio] Error stack: ${error.stack}`);
      if (error.response) {
        console.error(`[TTS Service] [generateAudio] Response status: ${error.response.status}`);
        console.error(`[TTS Service] [generateAudio] Response data:`, JSON.stringify(error.response.data, null, 2));
        throw new Error(`TTS API error: ${error.response.data?.detail || error.response.statusText}`);
      } else if (error.request) {
        console.error(`[TTS Service] [generateAudio] No response received from TTS backend`);
        throw new Error('TTS backend not responding. Is it running?');
      } else {
        throw new Error(`TTS request failed: ${error.message}`);
      }
    }
  }
  
  /**
   * Get audio file URL
   * Lấy URL file audio
   * 
   * @param {string} fileId - File ID from TTS backend
   * @returns {string} Audio file URL
   */
  getAudioURL(fileId) {
    return `${this.baseURL}/api/tts/audio/${fileId}`;
  }
  
  /**
   * Get audio file data
   * Lấy dữ liệu file audio
   * 
   * @param {string} fileId - File ID
   * @returns {Promise<ArrayBuffer>} Audio file data
   */
  async getAudioFile(fileId) {
    console.log(`[TTS Service] Getting audio file: ${fileId}`);
    console.log(`[TTS Service] Đang lấy file audio: ${fileId}`);
    try {
      const response = await axios.get(
        `${this.baseURL}/api/tts/audio/${fileId}`,
        {
          responseType: 'arraybuffer', // Important: Get binary data
          timeout: 60000 // 1 minute timeout
        }
      );
      console.log(`[TTS Service] ✅ Audio file retrieved successfully. Size: ${response.data.byteLength} bytes`);
      console.log(`[TTS Service] ✅ Đã lấy file audio thành công. Kích thước: ${response.data.byteLength} bytes`);
      return response.data;
    } catch (error) {
      console.error(`[TTS Service] ❌ Failed to get audio file ${fileId}:`, error.message);
      console.error(`[TTS Service] ❌ Không thể lấy file audio ${fileId}:`, error.message);
      if (error.response?.status === 404) {
        throw new Error('Audio file not found or expired');
      }
      throw new Error(`Failed to get audio file: ${error.message}`);
    }
  }
  
  /**
   * Get audio metadata
   * Lấy metadata audio
   * 
   * @param {string} fileId - File ID
   * @returns {Promise<Object>} Audio metadata
   */
  async getAudioMetadata(fileId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/tts/audio/${fileId}/metadata`,
        { timeout: 10000 }
      );
      return response.data.metadata;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Audio file not found or expired');
      }
      throw new Error(`Failed to get audio metadata: ${error.message}`);
    }
  }
  
  /**
   * Delete audio file
   * Xóa file audio
   * 
   * @param {string} fileId - File ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteAudio(fileId) {
    try {
      await axios.delete(
        `${this.baseURL}/api/tts/audio/${fileId}`,
        { timeout: 10000 }
      );
      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        return false; // Already deleted or not found
      }
      throw new Error(`Failed to delete audio: ${error.message}`);
    }
  }
  
  /**
   * Check TTS backend health
   * Kiểm tra sức khỏe TTS backend
   * 
   * @returns {Promise<boolean>} Health status
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseURL}/health`, { timeout: 5000 });
      return response.data.status === 'healthy';
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
let ttsServiceInstance = null;

export function getTTSService() {
  if (!ttsServiceInstance) {
    ttsServiceInstance = new TTSService();
  }
  return ttsServiceInstance;
}

