/**
 * TTS Service - Integration with TTS Backend
 * Dịch vụ TTS - Tích hợp với TTS Backend
 */
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { 
  getDefaultBackend, 
  getBackendConfig, 
  getMappedVoice,
  TTS_BACKENDS 
} from '../config/ttsConfig.js';

/**
 * Safely format objects for logging without dumping huge payloads
 * Định dạng dữ liệu an toàn để log mà không ghi toàn bộ payload lớn
 */
const describeBinaryPayload = (payload) => {
  if (Buffer.isBuffer(payload)) {
    return `[Binary Buffer, length: ${payload.length} bytes]`;
  }
  if (payload instanceof ArrayBuffer) {
    return `[Binary ArrayBuffer, length: ${payload.byteLength} bytes]`;
  }
  if (ArrayBuffer.isView(payload)) {
    return `[Binary ${payload.constructor.name}, length: ${payload.byteLength} bytes]`;
  }
  return null;
};

const formatSafeJson = (data, maxLength = 2000) => {
  try {
    if (data === undefined) return 'undefined';
    if (data === null) return 'null';

    const binaryDescription = describeBinaryPayload(data);
    if (binaryDescription) {
      return binaryDescription;
    }

    const json = typeof data === 'string' ? data : JSON.stringify(data);
    if (json.length > maxLength) {
      return `${json.slice(0, maxLength)}... [truncated ${json.length - maxLength} chars]`;
    }
    return json;
  } catch (error) {
    return `[Unserializable data: ${error.message}]`;
  }
};

const isPlainObject = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  !Buffer.isBuffer(value);

const extractMetadataPayload = (responseBody) => {
  if (!responseBody) {
    return null;
  }

  if (isPlainObject(responseBody)) {
    if (isPlainObject(responseBody.file_metadata)) {
      return responseBody.file_metadata;
    }
    if (isPlainObject(responseBody.metadata)) {
      return responseBody.metadata;
    }
    return responseBody;
  }

  if (typeof responseBody === 'string') {
    try {
      const parsed = JSON.parse(responseBody);
      if (isPlainObject(parsed.file_metadata)) {
        return parsed.file_metadata;
      }
      if (isPlainObject(parsed.metadata)) {
        return parsed.metadata;
      }
      return isPlainObject(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  return null;
};

export class TTSService {
  constructor(baseURL = null) {
    // Get default backend config / Lấy cấu hình backend mặc định
    const defaultBackend = getDefaultBackend();
    this.defaultBackend = defaultBackend;
    
    // Use provided baseURL or default backend URL / Sử dụng baseURL được cung cấp hoặc URL backend mặc định
    this.baseURL = baseURL || process.env.TTS_BACKEND_URL || defaultBackend.baseURL;
    
    this.defaultSpeaker = process.env.TTS_DEFAULT_SPEAKER || '05';
    this.defaultExpiryHours = parseInt(process.env.TTS_DEFAULT_EXPIRY_HOURS || '365');
    
    // Default model from environment or default backend / Model mặc định từ môi trường hoặc backend mặc định
    this.defaultModel = process.env.TTS_DEFAULT_MODEL || defaultBackend.model;
    
    // Default voice from environment or default backend / Giọng mặc định từ môi trường hoặc backend mặc định
    this.defaultVoice = process.env.TTS_DEFAULT_VOICE || defaultBackend.defaultVoice;
    
    this.defaultAutoVoice = process.env.TTS_AUTO_VOICE === 'true';
    this.defaultAutoChunk = process.env.TTS_AUTO_CHUNK !== 'false'; // Default true
    this.defaultMaxChars = parseInt(process.env.TTS_MAX_CHARS || '256');
  }
  
  /**
   * Get backend URL for a specific model
   * Lấy URL backend cho một model cụ thể
   * 
   * @param {string} model - Model name
   * @returns {string} Backend URL
   */
  getBackendURL(model) {
    const backendConfig = getBackendConfig(model);
    if (backendConfig) {
      return backendConfig.baseURL;
    }
    // Fallback to default / Dự phòng về mặc định
    return this.baseURL;
  }
  
  /**
   * Map voice ID to backend-specific voice ID
   * Ánh xạ voice ID sang voice ID cụ thể của backend
   * 
   * @param {string} voiceId - Original voice ID or voice name (e.g., 'id_0001' or 'quynh')
   * @param {string} model - Model name
   * @returns {string} Mapped voice ID for the backend
   */
  mapVoiceId(voiceId, model) {
    if (!voiceId) {
      console.log(`[TTS Service] [mapVoiceId] [DEBUG] Voice ID is empty, returning as-is`);
      return voiceId;
    }
    
    console.log(`[TTS Service] [mapVoiceId] [DEBUG] Mapping voice: "${voiceId}" for model: "${model}"`);
    
    // Try to map using voice mapping config / Thử ánh xạ bằng cấu hình ánh xạ giọng
    const mappedVoice = getMappedVoice(voiceId, model);
    if (mappedVoice) {
      console.log(`[TTS Service] [mapVoiceId] [DEBUG] ✅ Mapping found: "${voiceId}" → "${mappedVoice}"`);
      return mappedVoice;
    }
    
    // If no mapping found:
    // - For VietTTS: return as-is (might be valid VietTTS voice name)
    // - For VieNeu-TTS: return as-is (might be "male", "female", or valid voice ID)
    // Nếu không tìm thấy ánh xạ:
    // - Cho VietTTS: trả về như cũ (có thể là tên giọng VietTTS hợp lệ)
    // - Cho VieNeu-TTS: trả về như cũ (có thể là "male", "female", hoặc voice ID hợp lệ)
    console.log(`[TTS Service] [mapVoiceId] [DEBUG] ⚠️  No mapping found, returning original: "${voiceId}"`);
    return voiceId;
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
      // Dia-specific parameters / Tham số riêng Dia
      temperature = 1.3,
      top_p = 0.95,
      cfg_scale = 3.0,
      speedFactor = 1.0,  // Normal speed to match preset (0.8-1.0, 1.0 = normal)
      trimSilence = false,  // Default to false for worker (trim can cut off important dialogue)
      normalize = true,  // Default to true for worker (normalize is useful)
      // VieNeu-TTS specific parameters / Tham số riêng VieNeu-TTS
      voice = this.defaultVoice,  // Voice ID like "id_0004" or "female"/"male" / ID giọng như "id_0004" hoặc "female"/"male"
      autoVoice = this.defaultAutoVoice,  // Auto-detect gender from text / Tự động phát hiện giới tính từ văn bản
      refAudioPath = null,  // Custom reference audio path / Đường dẫn audio tham chiếu tùy chỉnh
      refText = null,  // Custom reference text / Văn bản tham chiếu tùy chỉnh
      autoChunk = this.defaultAutoChunk,  // Auto-chunk long text / Tự động chia nhỏ văn bản dài
      maxChars = this.defaultMaxChars,  // Max chars per chunk / Ký tự tối đa mỗi chunk
      // Common parameters / Tham số chung
      store = true,
      returnAudio = false
    } = options;
    
    // Format text with speaker ID for Dia model only
    // Định dạng văn bản với speaker ID chỉ cho model Dia
    let formattedText = text;
    if (model === 'dia' && !text.startsWith('[')) {
      formattedText = `[${speakerId}] ${text}`;
    }
    
    try {
      // CRITICAL: Get backend URL FIRST to determine which backend we're actually using
      // QUAN TRỌNG: Lấy URL backend TRƯỚC để xác định backend nào đang được sử dụng
      const backendURL = this.getBackendURL(model);
      const backendConfig = getBackendConfig(model);
      const actualBackendName = backendConfig ? backendConfig.name : model;
      
      // CRITICAL: Map voice ID to backend-specific voice ID BEFORE building request
      // QUAN TRỌNG: Ánh xạ voice ID sang voice ID cụ thể của backend TRƯỚC KHI xây dựng request
      // Use actual backend name for mapping (not just model name)
      // Sử dụng tên backend thực tế cho mapping (không chỉ tên model)
      const mappedVoice = this.mapVoiceId(voice, actualBackendName);
      
      // Debug logging / Log debug
      console.log(`[TTS Service] [generateAudio] ========================================`);
      console.log(`[TTS Service] [generateAudio] Sending request to TTS backend...`);
      console.log(`[TTS Service] [generateAudio] Đang gửi yêu cầu tới TTS backend...`);
      console.log(`[TTS Service] [generateAudio] Model: ${model}`);
      console.log(`[TTS Service] [generateAudio] Actual Backend: ${actualBackendName}`);
      console.log(`[TTS Service] [generateAudio] Backend URL: ${backendURL}/api/tts/synthesize`);
      console.log(`[TTS Service] [generateAudio] Text length: ${formattedText.length} chars`);
      console.log(`[TTS Service] [generateAudio] Original voice: "${voice}"`);
      console.log(`[TTS Service] [generateAudio] Mapped voice: "${mappedVoice}" (for ${actualBackendName})`);
      console.log(`[TTS Service] [generateAudio] Voice mapping: ${voice} → ${mappedVoice}`);
      
      const modelInfo = (model === 'viettts' || model === 'viet-tts') 
        ? `, Voice: ${mappedVoice}, Speed: ${speedFactor || 1.0}`
        : model === 'vieneu-tts' 
          ? `, Voice: ${mappedVoice}, AutoChunk: ${autoChunk}, MaxChars: ${maxChars}` 
          : `, Speaker: ${speakerId}`;
      console.log(`[TTS Service] [generateAudio] Model: ${model}${modelInfo}`);
      
      // Build request body based on model / Xây dựng body request dựa trên model
      let requestBody;
      
      if (model === 'viettts' || model === 'viet-tts') {
        // VietTTS uses simpler API format: only text, voice, speed
        // VietTTS sử dụng định dạng API đơn giản hơn: chỉ text, voice, speed
        requestBody = {
          text: formattedText,
          voice: mappedVoice || 'quynh',  // Use mapped voice / Sử dụng giọng đã ánh xạ
          speed: speedFactor || 1.0  // Speed factor (0.8-1.2, 1.0 = normal)
        };
      } else {
        // Other models (vieneu-tts, dia) use full format
        // Các model khác (vieneu-tts, dia) sử dụng định dạng đầy đủ
        requestBody = {
          text: formattedText,
          model: model,
          store: store,
          expiry_hours: expiryHours,
          return_audio: returnAudio
        };
        
        if (model === 'vieneu-tts') {
          // VieNeu-TTS parameters / Tham số VieNeu-TTS
          requestBody.voice = mappedVoice;  // Use mapped voice / Sử dụng giọng đã ánh xạ
          requestBody.auto_voice = autoVoice;
          requestBody.auto_chunk = autoChunk;
          requestBody.max_chars = maxChars;
          // Optional custom reference / Tham chiếu tùy chỉnh tùy chọn
          if (refAudioPath) {
            requestBody.ref_audio_path = refAudioPath;
          }
          if (refText) {
            requestBody.ref_text = refText;
          }
          
          // Debug: Log request body for vieneu-tts / Debug: Log request body cho vieneu-tts
          console.log(`[TTS Service] [generateAudio] [DEBUG] VieNeu-TTS Request Body:`);
          console.log(`[TTS Service] [generateAudio] [DEBUG]   - text: "${requestBody.text.substring(0, 50)}..." (${requestBody.text.length} chars)`);
          console.log(`[TTS Service] [generateAudio] [DEBUG]   - model: ${requestBody.model}`);
          console.log(`[TTS Service] [generateAudio] [DEBUG]   - voice: "${requestBody.voice}"`);
          console.log(`[TTS Service] [generateAudio] [DEBUG]   - auto_voice: ${requestBody.auto_voice}`);
          console.log(`[TTS Service] [generateAudio] [DEBUG]   - auto_chunk: ${requestBody.auto_chunk}`);
          console.log(`[TTS Service] [generateAudio] [DEBUG]   - max_chars: ${requestBody.max_chars}`);
          console.log(`[TTS Service] [generateAudio] [DEBUG]   - store: ${requestBody.store}`);
          console.log(`[TTS Service] [generateAudio] [DEBUG]   - return_audio: ${requestBody.return_audio}`);
          if (requestBody.ref_audio_path) {
            console.log(`[TTS Service] [generateAudio] [DEBUG]   - ref_audio_path: ${requestBody.ref_audio_path}`);
          }
          if (requestBody.ref_text) {
            console.log(`[TTS Service] [generateAudio] [DEBUG]   - ref_text: "${requestBody.ref_text.substring(0, 30)}..."`);
          }
        } else if (model === 'coqui-xtts-v2' || model === 'coqui-tts' || model === 'xtts-v2') {
          // Coqui XTTS-v2 parameters / Tham số Coqui XTTS-v2
          requestBody.speaker = mappedVoice;  // Use mapped voice (speaker name) / Sử dụng giọng đã ánh xạ (tên speaker)
          requestBody.language = options.language || 'en';  // Language code (default: en)
          // Optional: speaker_wav for voice cloning / Tùy chọn: speaker_wav cho nhân bản giọng
          if (refAudioPath) {
            requestBody.speaker_wav = refAudioPath;
          }
          
          // Debug: Log request body for coqui-xtts-v2 / Debug: Log request body cho coqui-xtts-v2
          console.log(`[TTS Service] [generateAudio] [DEBUG] Coqui XTTS-v2 Request Body:`);
          console.log(`[TTS Service] [generateAudio] [DEBUG]   - text: "${requestBody.text.substring(0, 50)}..." (${requestBody.text.length} chars)`);
          console.log(`[TTS Service] [generateAudio] [DEBUG]   - model: ${requestBody.model}`);
          console.log(`[TTS Service] [generateAudio] [DEBUG]   - speaker: "${requestBody.speaker}"`);
          console.log(`[TTS Service] [generateAudio] [DEBUG]   - language: ${requestBody.language}`);
          console.log(`[TTS Service] [generateAudio] [DEBUG]   - store: ${requestBody.store}`);
          console.log(`[TTS Service] [generateAudio] [DEBUG]   - return_audio: ${requestBody.return_audio}`);
          if (requestBody.speaker_wav) {
            console.log(`[TTS Service] [generateAudio] [DEBUG]   - speaker_wav: ${requestBody.speaker_wav}`);
          }
        } else if (model === 'dia') {
          // Dia parameters / Tham số Dia
          requestBody.temperature = temperature;
          requestBody.top_p = top_p;
          requestBody.cfg_scale = cfg_scale;
          requestBody.speed_factor = speedFactor;
          requestBody.trim_silence = trimSilence;
          requestBody.normalize = normalize;
        }
      }
      
      // Debug: Log full request before sending / Debug: Log toàn bộ request trước khi gửi
      console.log(`[TTS Service] [generateAudio] [DEBUG] Full Request Body (JSON):`);
      console.log(JSON.stringify(requestBody, null, 2));
      console.log(`[TTS Service] [generateAudio] [DEBUG] Sending POST to: ${backendURL}/api/tts/synthesize`);
      
      const response = await axios.post(
        `${backendURL}/api/tts/synthesize`,
        requestBody,
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
      
      // Debug: Log response data (without audio if present) / Debug: Log dữ liệu phản hồi (không có audio nếu có)
      const contentTypeHeader = response.headers['content-type'] || response.headers['Content-Type'] || '';
      const lowerContentType = contentTypeHeader.toLowerCase();
      const isJsonResponse = lowerContentType.includes('application/json') || lowerContentType.includes('text/json');

      if (response.data) {
        if (isJsonResponse) {
          const responsePayload = typeof response.data === 'string'
            ? (() => {
                try {
                  return JSON.parse(response.data);
                } catch {
                  return response.data.slice(0, 2000) + (response.data.length > 2000 ? '... [truncated]' : '');
                }
              })()
            : response.data;

          if (typeof responsePayload === 'string') {
            console.log(`[TTS Service] [generateAudio] [DEBUG] Response data (string JSON):`, responsePayload);
          } else {
            const responseDataForLog = { ...responsePayload };
            if (responseDataForLog.audio) {
              responseDataForLog.audio = `[Base64 audio data, length: ${responseDataForLog.audio.length} chars]`;
            }
            console.log(`[TTS Service] [generateAudio] [DEBUG] Response data:`, JSON.stringify(responseDataForLog, null, 2));
          }
        } else {
          const binaryDescription = describeBinaryPayload(response.data);
          if (binaryDescription) {
            console.log(`[TTS Service] [generateAudio] [DEBUG] Response data: ${binaryDescription}`);
          } else if (typeof response.data === 'string') {
            console.log(`[TTS Service] [generateAudio] [DEBUG] Response data: [Non-JSON string, length: ${response.data.length} chars, content-type: ${lowerContentType || 'unknown'}]`);
          } else {
            console.log(`[TTS Service] [generateAudio] [DEBUG] Response data: [Non-JSON payload type ${typeof response.data}]`);
          }
        }
      }
      
      // Check if paragraph was skipped (meaningless content)
      // Kiểm tra xem paragraph có bị bỏ qua không (nội dung vô nghĩa)
      const isSkipped = response.data?.skipped || response.headers['x-skipped'] === 'true' || response.headers['X-Skipped'] === 'true';
      if (isSkipped) {
        const reason = response.data?.reason || 'Paragraph skipped - meaningless content';
        console.log(`[TTS Service] [generateAudio] ⏭️ Paragraph skipped: ${reason}`);
        console.log(`[TTS Service] [generateAudio] ⏭️ Paragraph đã được bỏ qua: ${reason}`);
        // Throw a special error that worker can catch and handle gracefully
        // Ném một lỗi đặc biệt mà worker có thể bắt và xử lý một cách graceful
        const skipError = new Error(`Skipping paragraph: ${reason}`);
        skipError.name = 'SkipError';
        skipError.isSkip = true;
        skipError.reason = reason;
        throw skipError;
      }
      
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
        console.error(`[TTS Service] [generateAudio] Headers:`, formatSafeJson(response.headers));
        console.error(`[TTS Service] [generateAudio] Body:`, formatSafeJson(response.data));
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
      
      // Return metadata from response body (object only, ignore binary payloads)
      const metadataPayload = isJsonResponse ? extractMetadataPayload(response.data) : null;
      const result = {
        requestId: requestId || uuidv4(),
        fileId: finalFileId,
        metadata: metadataPayload,
        expiresAt: finalExpiresAt
      };
      console.log(`[TTS Service] [generateAudio] ✅ Returning metadata`);
      const metadataKeys = result.metadata ? Object.keys(result.metadata) : [];
      console.log(`[TTS Service] [generateAudio] Result summary:`, {
        requestId: result.requestId,
        fileId: result.fileId,
        metadataKeys,
        metadataKeyCount: metadataKeys.length
      });
      return result;
    } catch (error) {
      // Re-throw skip errors as-is so worker can handle them
      // Ném lại lỗi skip như cũ để worker có thể xử lý
      if (error.isSkip || error.name === 'SkipError') {
        throw error;
      }
      
      console.error(`[TTS Service] [generateAudio] ❌ ERROR occurred!`);
      console.error(`[TTS Service] [generateAudio] ❌ Đã xảy ra LỖI!`);
      console.error(`[TTS Service] [generateAudio] Error message: ${error.message}`);
      console.error(`[TTS Service] [generateAudio] Error stack: ${error.stack}`);
      if (error.response) {
        console.error(`[TTS Service] [generateAudio] Response status: ${error.response.status}`);
        console.error(`[TTS Service] [generateAudio] Response data:`, formatSafeJson(error.response.data));
        
        // Check if error response indicates skipped paragraph
        // Kiểm tra xem phản hồi lỗi có cho biết paragraph bị bỏ qua không
        const errorDetail = error.response.data?.detail || '';
        const isSkipError = errorDetail.includes('meaningless') || 
                           errorDetail.includes('too short') || 
                           errorDetail.includes('only punctuation') ||
                           errorDetail.includes('separator');
        
        if (isSkipError && error.response.status === 400) {
          // Treat validation errors for meaningless text as skip errors
          // Xử lý lỗi validation cho text vô nghĩa như lỗi skip
          const skipError = new Error(`Skipping paragraph: ${errorDetail}`);
          skipError.name = 'SkipError';
          skipError.isSkip = true;
          skipError.reason = errorDetail;
          throw skipError;
        }
        
        throw new Error(`TTS API error: ${errorDetail || error.response.statusText}`);
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
      // Some backends (like VietTTS) don't support DELETE endpoint
      // Return false instead of throwing to allow graceful degradation
      // Một số backend (như VietTTS) không hỗ trợ endpoint DELETE
      // Trả về false thay vì throw để cho phép xử lý lỗi mượt mà
      if (error.response?.status === 405) {
        console.warn(`[TTS Service] DELETE endpoint not supported by backend (405). File will expire naturally.`);
        console.warn(`[TTS Service] Backend không hỗ trợ endpoint DELETE (405). File sẽ tự động hết hạn.`);
        return false;
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

