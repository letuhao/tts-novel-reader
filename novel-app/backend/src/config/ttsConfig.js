/**
 * TTS Backend Configuration
 * Cấu hình TTS Backend
 * 
 * Supports multiple TTS backends with voice mapping
 * Hỗ trợ nhiều TTS backend với ánh xạ giọng nói
 */

/**
 * TTS Backend Presets
 * Các Preset TTS Backend
 */
export const TTS_BACKENDS = {
  VIETTTS: {
    name: 'viettts',
    displayName: 'VietTTS (dangvansam)',
    baseURL: process.env.VIETTTS_BACKEND_URL || 'http://127.0.0.1:11111',
    model: 'viettts',
    defaultVoice: 'quynh',
    port: 11111
  },
  VIENEU_TTS: {
    name: 'vieneu-tts',
    displayName: 'VieNeu-TTS',
    baseURL: process.env.VIENEU_TTS_BACKEND_URL || 'http://127.0.0.1:11111',
    model: 'vieneu-tts',
    defaultVoice: 'id_0004',
    port: 11111
  },
  COQUI_XTTS_V2: {
    name: 'coqui-xtts-v2',
    displayName: 'Coqui XTTS-v2 (English)',
    baseURL: process.env.COQUI_TTS_BACKEND_URL || 'http://127.0.0.1:11111',
    model: 'coqui-xtts-v2',
    defaultVoice: 'Claribel Dervla',
    port: 11111
  }
};

/**
 * Reverse Voice Mapping: VietTTS Voice Names → VieNeu-TTS Voice IDs
 * Ánh xạ Ngược: Tên Giọng VietTTS → Voice ID VieNeu-TTS
 * 
 * Maps VietTTS voice names (like "quynh", "cdteam") to VieNeu-TTS voice IDs
 * Ánh xạ tên giọng VietTTS (như "quynh", "cdteam") sang voice ID VieNeu-TTS
 * 
 * IMPORTANT: Only id_0002 and id_0004 are female voices in VieNeu-TTS
 * QUAN TRỌNG: Chỉ id_0002 và id_0004 là giọng nữ trong VieNeu-TTS
 * - id_0002: Female voice 1 (cao)
 * - id_0004: Female voice 2 (nhẹ nhàng, narrator) - matches quynh
 */
export const VIETTTS_TO_VIENEU_MAPPING = {
  // Female voices / Giọng nữ
  'quynh': 'id_0004',        // giọng nữ nhẹ nhàng, narrator → id_0004 (female, narrator) ✅
  'nu-nhe-nhang': 'id_0004', // giọng nữ nhẹ nhàng → id_0004 (female, soft) ✅
  'diep-chi': 'id_0002',     // giọng nữ cao → id_0002 (female, high) ✅
  
  // Male voices / Giọng nam
  'cdteam': 'id_0007',       // giọng nam trầm → id_0007 (male, deep) ✅
  'nguyen-ngoc-ngan': 'id_0007', // giọng nam trầm → id_0007 (male, deep) ✅
  'nsnd-le-chuc': 'id_0001', // giọng nam nhẹ nhàng → id_0001 (male, soft) ✅
  'son-tung-mtp': 'id_0003', // giọng nam nhỏ → id_0003 (male, high) - closest match
  'doremon': 'id_0005'       // giọng nam rất cao → id_0005 (male, high) ✅
};

/**
 * Voice ID Mapping: dangvansam-VietTTS → VieNeu-TTS
 * Ánh xạ Voice ID: dangvansam-VietTTS → VieNeu-TTS
 * 
 * Maps voice IDs from dangvansam-VietTTS backend to VieNeu-TTS backend
 * Ánh xạ voice ID từ backend dangvansam-VietTTS sang backend VieNeu-TTS
 */
export const VOICE_MAPPING = {
  // id_0001: giọng nam nhẹ nhàng
  'id_0001': {
    viettts: 'nsnd-le-chuc',  // giọng nam nhẹ nhàng tiếng Việt
    vieneuTTS: 'id_0001',     // Male voice 1 (nhẹ nhàng)
    description: 'giọng nam nhẹ nhàng',
    gender: 'male',
    tone: 'nhẹ nhàng'
  },
  
  // id_0002: giọng nữ cao
  'id_0002': {
    viettts: 'diep-chi',      // giọng nữ cao
    vieneuTTS: 'id_0002',     // Female voice 1 (cao)
    description: 'giọng nữ cao',
    gender: 'female',
    tone: 'cao'
  },
  
  // id_0003: giọng nam cao
  'id_0003': {
    viettts: 'cdteam',        // giọng nam trầm (closest match)
    vieneuTTS: 'id_0003',     // Male voice 2 (cao)
    description: 'giọng nam cao',
    gender: 'male',
    tone: 'cao'
  },
  
  // id_0004: giọng nữ nhẹ nhàng, dùng để dẫn truyện
  'id_0004': {
    viettts: 'quynh',         // giọng nữ nhẹ nhàng, dùng làm Narrator
    vieneuTTS: 'id_0004',     // Female voice 2 (nhẹ nhàng, narrator)
    description: 'giọng nữ nhẹ nhàng, dùng để dẫn truyện',
    gender: 'female',
    tone: 'nhẹ nhàng',
    preferredForNarrator: true
  },
  
  // id_0005: giọng nam cao
  'id_0005': {
    viettts: 'cdteam',        // giọng nam trầm (closest match)
    vieneuTTS: 'id_0005',     // Male voice 3 (cao)
    description: 'giọng nam cao',
    gender: 'male',
    tone: 'cao'
  },
  
  // id_0007: giọng nam trầm
  'id_0007': {
    viettts: 'cdteam',        // giọng nam trầm
    vieneuTTS: 'id_0007',     // Male voice 4 (trầm)
    description: 'giọng nam trầm',
    gender: 'male',
    tone: 'trầm'
  }
};

/**
 * Get voice mapping for a specific backend
 * Lấy ánh xạ giọng cho một backend cụ thể
 * 
 * @param {string} voiceId - Voice ID or voice name (e.g., 'id_0001' or 'quynh')
 * @param {string} backendName - Backend name ('viettts' or 'vieneu-tts')
 * @returns {string|null} Mapped voice ID for the backend
 */
export function getMappedVoice(voiceId, backendName) {
  if (!voiceId) {
    console.log(`[TTS Config] [getMappedVoice] [DEBUG] Voice ID is empty`);
    return null;
  }
  
  console.log(`[TTS Config] [getMappedVoice] [DEBUG] Input: voiceId="${voiceId}", backendName="${backendName}"`);
  
  // CRITICAL: Always map when target backend is vieneu-tts
  // QUAN TRỌNG: Luôn ánh xạ khi backend đích là vieneu-tts
  if (backendName === 'vieneu-tts') {
    // Case 1: Voice ID starts with 'id_' - use standard mapping
    // Trường hợp 1: Voice ID bắt đầu bằng 'id_' - sử dụng ánh xạ chuẩn
    if (voiceId.startsWith('id_')) {
      const mapping = VOICE_MAPPING[voiceId];
      if (mapping && mapping.vieneuTTS) {
        const mapped = mapping.vieneuTTS;
        console.log(`[TTS Config] [getMappedVoice] [DEBUG] ✅ Standard mapping (VieNeu-TTS): "${voiceId}" → "${mapped}"`);
        return mapped;
      } else {
        // Voice ID might already be valid for VieNeu-TTS (e.g., id_0004)
        // Voice ID có thể đã hợp lệ cho VieNeu-TTS (ví dụ: id_0004)
        console.log(`[TTS Config] [getMappedVoice] [DEBUG] ℹ️  Voice ID "${voiceId}" might be valid for VieNeu-TTS, returning as-is`);
        return voiceId;
      }
    }
    
    // Case 2: Voice ID is a VietTTS voice name (e.g., "quynh", "cdteam") - use reverse mapping
    // Trường hợp 2: Voice ID là tên giọng VietTTS (ví dụ: "quynh", "cdteam") - sử dụng ánh xạ ngược
    if (VIETTTS_TO_VIENEU_MAPPING[voiceId]) {
      const mapped = VIETTTS_TO_VIENEU_MAPPING[voiceId];
      console.log(`[TTS Config] [getMappedVoice] [DEBUG] ✅ Found reverse mapping (VietTTS → VieNeu-TTS): "${voiceId}" → "${mapped}"`);
      return mapped;
    }
    
    // Case 3: Could be "male", "female", or other valid VieNeu-TTS voice identifier
    // Trường hợp 3: Có thể là "male", "female", hoặc identifier giọng VieNeu-TTS hợp lệ khác
    console.log(`[TTS Config] [getMappedVoice] [DEBUG] ℹ️  Returning as-is for VieNeu-TTS: "${voiceId}" (could be "male", "female", or valid voice ID)`);
    return voiceId;
  }
  
  // For VietTTS backend: map id_xxx to VietTTS voice names
  // Cho VietTTS backend: ánh xạ id_xxx sang tên giọng VietTTS
  if ((backendName === 'viettts' || backendName === 'viet-tts') && voiceId.startsWith('id_')) {
    const mapping = VOICE_MAPPING[voiceId];
    if (mapping && mapping.viettts) {
      const mapped = mapping.viettts;
      console.log(`[TTS Config] [getMappedVoice] [DEBUG] ✅ Standard mapping (VietTTS): "${voiceId}" → "${mapped}"`);
      return mapped;
    }
  }
  
  // For VietTTS: return as-is (might be valid VietTTS voice name like "quynh")
  // Cho VietTTS: trả về như cũ (có thể là tên giọng VietTTS hợp lệ như "quynh")
  if (backendName === 'viettts' || backendName === 'viet-tts') {
    console.log(`[TTS Config] [getMappedVoice] [DEBUG] ℹ️  Returning as-is for VietTTS: "${voiceId}" (might be valid VietTTS voice name)`);
    return voiceId;
  }
  
  // For Coqui XTTS-v2: validate speaker name or use default
  // Cho Coqui XTTS-v2: xác thực tên speaker hoặc dùng mặc định
  if (backendName === 'coqui-xtts-v2' || backendName === 'coqui-tts' || backendName === 'xtts-v2') {
    // Known valid Coqui XTTS-v2 speakers (built-in)
    // Các speaker Coqui XTTS-v2 hợp lệ đã biết (built-in)
    const validCoquiSpeakers = [
      'Claribel Dervla', 'Daisy Studious', 'Gracie Wise', 'Tammie Ema', 'Alison Dietlinde',
      'Ana Florence', 'Annmarie Nele', 'Asya Anara', 'Brenda Stern', 'Gitta Nikolina',
      'Henriette Usha', 'Sofia Hellen', 'Tammy Grit', 'Tanja Adelina', 'Vjollca Johnnie',
      'Nova Hogarth', 'Maja Ruoho', 'Uta Obando', 'Lidiya Szekeres', 'Chandra MacFarland',
      'Szofi Granger', 'Camilla Holmström', 'Lilya Stainthorpe', 'Zofija Kendrick', 'Narelle Moon',
      'Barbora MacLean', 'Alexandra Hisakawa', 'Alma María', 'Rosemary Okafor', 'Ige Behringer',
      'Filip Traverse', 'Damjan Chapman', 'Wulf Carlevaro',
      'Andrew Chipper', 'Badr Odhiambo', 'Dionisio Schuyler', 'Royston Min', 'Viktor Eka',
      'Abrahan Mack', 'Adde Michal', 'Baldur Sanjin', 'Craig Gutsy', 'Damien Black',
      'Gilberto Mathias', 'Ilkin Urbano', 'Kazuhiko Atallah', 'Ludvig Milivoj', 'Suad Qasim',
      'Torcull Diarmuid', 'Viktor Menelaos', 'Zacharie Aimilios', 'Aaron Dreschner', 'Kumar Dahl',
      'Eugenio Mataracı', 'Ferran Simen', 'Xavier Hayasaka', 'Luis Moray', 'Marcos Rudaski'
    ];
    
    // If voiceId is a valid Coqui speaker, return it
    // Nếu voiceId là speaker Coqui hợp lệ, trả về nó
    if (validCoquiSpeakers.includes(voiceId)) {
      console.log(`[TTS Config] [getMappedVoice] [DEBUG] ✅ Valid Coqui speaker: "${voiceId}"`);
      return voiceId;
    }
    
    // If voiceId is from a different model (e.g., VietTTS "quynh"), use default
    // Nếu voiceId từ model khác (ví dụ: VietTTS "quynh"), dùng mặc định
    console.log(`[TTS Config] [getMappedVoice] [DEBUG] ⚠️  Invalid Coqui speaker: "${voiceId}", using default: "Claribel Dervla"`);
    return 'Claribel Dervla'; // Default Coqui speaker
  }
  
  console.log(`[TTS Config] [getMappedVoice] [DEBUG] ❌ No mapping found, returning null`);
  return null;
}

/**
 * Get voice description
 * Lấy mô tả giọng
 * 
 * @param {string} voiceId - Voice ID
 * @returns {object|null} Voice mapping info
 */
export function getVoiceInfo(voiceId) {
  return VOICE_MAPPING[voiceId] || null;
}

/**
 * Get all available voice IDs
 * Lấy tất cả voice ID có sẵn
 * 
 * @returns {string[]} List of voice IDs
 */
export function getAvailableVoiceIds() {
  return Object.keys(VOICE_MAPPING);
}

/**
 * Get default TTS backend
 * Lấy TTS backend mặc định
 * 
 * @returns {object} Default backend config
 */
export function getDefaultBackend() {
  // Check TTS_DEFAULT_MODEL first (preferred), then TTS_DEFAULT_BACKEND
  // Kiểm tra TTS_DEFAULT_MODEL trước (ưu tiên), sau đó TTS_DEFAULT_BACKEND
  const model = process.env.TTS_DEFAULT_MODEL || process.env.TTS_DEFAULT_BACKEND || 'viettts';
  
  // Map model name to backend key
  // Ánh xạ tên model sang key backend
  if (model === 'vieneu-tts') {
    return TTS_BACKENDS.VIENEU_TTS;
  } else if (model === 'coqui-xtts-v2' || model === 'coqui-tts' || model === 'xtts-v2') {
    return TTS_BACKENDS.COQUI_XTTS_V2;
  } else {
    return TTS_BACKENDS.VIETTTS;
  }
}

/**
 * Get backend config by name
 * Lấy cấu hình backend theo tên
 * 
 * @param {string} backendName - Backend name
 * @returns {object|null} Backend config
 */
export function getBackendConfig(backendName) {
  if (backendName === 'vieneu-tts') {
    return TTS_BACKENDS.VIENEU_TTS;
  } else if (backendName === 'viettts' || backendName === 'viet-tts') {
    return TTS_BACKENDS.VIETTTS;
  } else if (backendName === 'coqui-xtts-v2' || backendName === 'coqui-tts' || backendName === 'xtts-v2') {
    return TTS_BACKENDS.COQUI_XTTS_V2;
  }
  return null;
}

