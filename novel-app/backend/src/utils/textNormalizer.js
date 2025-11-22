/**
 * Text Normalization Utility
 * Chuẩn hóa văn bản cho TTS
 * 
 * Converts system/game notification text into natural dialogue format
 * Chuyển đổi văn bản thông báo hệ thống/trò chơi sang định dạng hội thoại tự nhiên
 */

/**
 * Convert number to Vietnamese words (for better TTS pronunciation)
 * Chuyển đổi số sang từ tiếng Việt (để TTS phát âm tốt hơn)
 * 
 * @param {string|number} num - Number to convert
 * @returns {string} Vietnamese number words
 */
function numberToVietnameseWords(num) {
  if (typeof num === 'string') {
    // Remove +, -, and parse
    num = num.replace(/[+\-]/g, '');
    const parsed = parseInt(num, 10);
    if (isNaN(parsed)) return num; // Return original if not a number
    num = parsed;
  }
  
  if (num === 0) return 'không';
  if (num < 0) return 'âm ' + numberToVietnameseWords(-num);
  
  const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const tens = ['', 'mười', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
  
  if (num < 10) return ones[num];
  if (num < 20) {
    if (num === 10) return 'mười';
    if (num === 15) return 'mười lăm';
    return 'mười ' + ones[num % 10];
  }
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    if (one === 0) return tens[ten];
    if (one === 5) return tens[ten] + ' lăm';
    if (one === 1) return tens[ten] + ' mốt';
    return tens[ten] + ' ' + ones[one];
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;
    if (remainder === 0) return ones[hundred] + ' trăm';
    return ones[hundred] + ' trăm ' + numberToVietnameseWords(remainder);
  }
  if (num < 1000000) {
    const thousand = Math.floor(num / 1000);
    const remainder = num % 1000;
    if (remainder === 0) return numberToVietnameseWords(thousand) + ' nghìn';
    return numberToVietnameseWords(thousand) + ' nghìn ' + numberToVietnameseWords(remainder);
  }
  
  // For very large numbers, just say the number (TTS can handle it)
  // Với số rất lớn, chỉ cần đọc số (TTS có thể xử lý)
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Normalize text for TTS generation
 * Chuẩn hóa văn bản cho việc tạo TTS
 * 
 * Converts system notifications, game messages, and special formatting
 * into natural dialogue format
 * 
 * Chuyển đổi thông báo hệ thống, tin nhắn trò chơi, và định dạng đặc biệt
 * sang định dạng hội thoại tự nhiên
 * 
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
export function normalizeTextForTTS(text) {
  if (!text || typeof text !== 'string') return text;
  
  let normalized = text.trim();
  
  // Step 1: Handle angle brackets < > with numbers and units
  // Bước 1: Xử lý dấu ngoặc nhọn < > với số và đơn vị
  // Example: <+3000 điểm> -> "tăng thêm ba nghìn điểm"
  // Example: <15274 điểm> -> "một năm hai bảy bốn điểm"
  normalized = normalized.replace(/<\s*([+\-]?)\s*(\d+)\s*([^>]*?)\s*>/gi, (match, sign, num, unit) => {
    const number = parseInt(sign + num, 10);
    const unitText = unit.trim();
    
    if (sign === '+') {
      return `tăng thêm ${numberToVietnameseWords(Math.abs(number))}${unitText ? ' ' + unitText : ''}`;
    } else if (sign === '-') {
      return `giảm ${numberToVietnameseWords(Math.abs(number))}${unitText ? ' ' + unitText : ''}`;
    } else {
      return `${numberToVietnameseWords(number)}${unitText ? ' ' + unitText : ''}`;
    }
  });
  
  // Step 2: Remove outer brackets [ ] but preserve content
  // Bước 2: Loại bỏ dấu ngoặc vuông [ ] bên ngoài nhưng giữ nội dung
  // Handle nested brackets carefully
  // Xử lý dấu ngoặc lồng nhau cẩn thận
  normalized = normalized.replace(/^\s*\[\s*(.*?)\s*\]\s*$/s, '$1'); // Outer brackets only
  
  // Step 3: Handle nested brackets and system notifications
  // Bước 3: Xử lý dấu ngoặc lồng nhau và thông báo hệ thống
  // Example: [ sự kiện: [ tử vong (cực nóng)]] -> "Sự kiện tử vong cực nóng"
  normalized = normalized.replace(/\[\s*sự\s*kiện\s*:\s*\[\s*(.*?)\s*\]\s*\]/gi, (match, content) => {
    // Clean up the content inside
    let cleaned = content
      .replace(/\(([^)]+)\)/g, '$1') // Remove parentheses, keep content
      .trim();
    return `Sự kiện ${cleaned}`;
  });
  
  // Step 4: Remove remaining parentheses but keep content
  // Bước 4: Loại bỏ dấu ngoặc đơn còn lại nhưng giữ nội dung
  normalized = normalized.replace(/\(([^)]+)\)/g, '$1');
  
  // Step 5: Remove any remaining square brackets (if not handled above)
  // Bước 5: Loại bỏ dấu ngoặc vuông còn lại (nếu chưa được xử lý ở trên)
  normalized = normalized.replace(/\[\s*([^\]]+)\s*\]/g, '$1');
  
  // Step 6: Normalize whitespace (multiple spaces -> single space)
  // Bước 6: Chuẩn hóa khoảng trắng (nhiều khoảng trắng -> một khoảng trắng)
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  // Step 7: Fix common punctuation issues
  // Bước 7: Sửa các vấn đề dấu câu phổ biến
  normalized = normalized.replace(/\s+([.,;:!?])/g, '$1'); // Remove space before punctuation
  normalized = normalized.replace(/([.,;:!?])\s*([.,;:!?])/g, '$1'); // Remove duplicate punctuation
  normalized = normalized.replace(/([.,;:!?])([^\s])/g, '$1 $2'); // Add space after punctuation if missing
  
  // Step 8: Ensure text ends with proper punctuation if it doesn't already
  // Bước 8: Đảm bảo văn bản kết thúc bằng dấu câu phù hợp nếu chưa có
  if (!/[.!?。．！？]$/.test(normalized)) {
    normalized += '.';
  }
  
  return normalized.trim();
}

/**
 * Batch normalize multiple texts
 * Chuẩn hóa nhiều văn bản cùng lúc
 * 
 * @param {string[]} texts - Array of texts to normalize
 * @returns {string[]} Array of normalized texts
 */
export function normalizeTextsForTTS(texts) {
  if (!Array.isArray(texts)) return texts;
  return texts.map(text => normalizeTextForTTS(text));
}

