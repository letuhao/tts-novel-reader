/**
 * Paragraph Splitter Service - LLM-based intelligent paragraph splitting
 * Dịch vụ Chia Paragraph - Chia paragraph thông minh dựa trên LLM
 * 
 * Splits long paragraphs into smaller ones based on:
 * - Dialogue changes
 * - Speaker changes
 * - Natural sentence boundaries
 * - Context breaks
 * 
 * Chia các paragraph dài thành các paragraph nhỏ hơn dựa trên:
 * - Thay đổi đối thoại
 * - Thay đổi người nói
 * - Ranh giới câu tự nhiên
 * - Ngắt ngữ cảnh
 */

import { getOllamaProvider } from './ollamaProvider.js';

export class ParagraphSplitterService {
  constructor(model = 'qwen3:8b', ollamaURL = null) {
    this.model = model || process.env.OLLAMA_DEFAULT_MODEL || 'qwen3:8b';
    this.ollama = getOllamaProvider(ollamaURL, this.model);
    this.maxParagraphLength = 500; // Characters - split if longer
    this.minSplitLength = 50; // Minimum characters per split paragraph
    this.llmThreshold = 1000; // Only use LLM for paragraphs longer than this (chars)
  }

  /**
   * Check if service is available
   * Kiểm tra dịch vụ có sẵn không
   */
  async isAvailable() {
    try {
      const available = await this.ollama.isAvailable();
      if (!available) return false;
      return await this.ollama.isModelAvailable(this.model);
    } catch (error) {
      return false;
    }
  }

  /**
   * Split long paragraphs intelligently
   * Chia các paragraph dài một cách thông minh
   * 
   * @param {Array} paragraphs - Array of paragraph objects
   * @param {Object} options - Splitting options
   * @returns {Promise<Array>} Array of split paragraphs
   */
  async splitLongParagraphs(paragraphs, options = {}) {
    const {
      maxLength = this.maxParagraphLength,
      minLength = this.minSplitLength,
      useLLM = true
    } = options;

    const splitParagraphs = [];
    let paragraphNumber = 1;

    for (const para of paragraphs) {
      const text = para.text || '';
      const textLength = text.length;

      // If paragraph is short enough, keep as-is
      // Nếu paragraph đủ ngắn, giữ nguyên
      if (textLength <= maxLength) {
        splitParagraphs.push({
          ...para,
          paragraphNumber: paragraphNumber++
        });
        continue;
      }

      // Long paragraph - need to split
      // Paragraph dài - cần chia
      // Only log first few to avoid spam
      // Chỉ log vài cái đầu để tránh spam
      const longParagraphCount = splitParagraphs.filter(p => p.isSplit).length;
      if (longParagraphCount < 3) {
        console.log(`[ParagraphSplitter] Splitting long paragraph (${textLength} chars): "${text.substring(0, 100)}..."`);
        console.log(`[ParagraphSplitter] Đang chia paragraph dài (${textLength} ký tự): "${text.substring(0, 100)}..."`);
      } else if (longParagraphCount === 3) {
        console.log(`[ParagraphSplitter] ... (continuing to split more long paragraphs, suppressing detailed logs)`);
        console.log(`[ParagraphSplitter] ... (tiếp tục chia các paragraph dài khác, ẩn log chi tiết)`);
      }

      // Use LLM only for very long paragraphs (>1000 chars), use rule-based for others
      // Dùng LLM chỉ cho các paragraph rất dài (>1000 ký tự), dùng rule-based cho các cái khác
      const shouldUseLLM = useLLM && textLength > this.llmThreshold && await this.isAvailable();
      
      let splits;
      if (shouldUseLLM) {
        try {
          console.log(`[ParagraphSplitter] Using LLM for very long paragraph (${textLength} chars)`);
          console.log(`[ParagraphSplitter] Sử dụng LLM cho paragraph rất dài (${textLength} ký tự)`);
          splits = await this._splitWithLLM(text, minLength);
        } catch (llmError) {
          console.warn(`[ParagraphSplitter] ⚠️ LLM splitting failed, using rule-based fallback: ${llmError.message}`);
          splits = this._splitWithRules(text, minLength);
        }
      } else {
        // Use fast rule-based splitting for most paragraphs
        // Dùng rule-based nhanh cho hầu hết các paragraph
        splits = this._splitWithRules(text, minLength);
      }

      // Create new paragraphs from splits
      // Tạo các paragraph mới từ các phần chia
      for (const splitText of splits) {
        if (splitText.trim().length >= minLength) {
          splitParagraphs.push({
            id: para.id ? `${para.id}_split_${splitParagraphs.length}` : undefined,
            paragraphNumber: paragraphNumber++,
            lines: splitText.split('\n').filter(l => l.trim()),
            text: splitText.trim(),
            originalParagraphNumber: para.paragraphNumber,
            isSplit: true
          });
        }
      }
    }

    console.log(`[ParagraphSplitter] ✅ Split ${paragraphs.length} paragraphs into ${splitParagraphs.length} paragraphs`);
    console.log(`[ParagraphSplitter] ✅ Đã chia ${paragraphs.length} paragraphs thành ${splitParagraphs.length} paragraphs`);

    return splitParagraphs;
  }

  /**
   * Split paragraph using LLM
   * Chia paragraph sử dụng LLM
   * 
   * @param {string} text - Paragraph text
   * @param {number} minLength - Minimum length per split
   * @returns {Promise<Array<string>>} Array of split text segments
   */
  async _splitWithLLM(text, minLength) {
    const prompt = this._buildSplitPrompt(text, minLength);
    
    const response = await this.ollama.generateJSON(prompt, {
      model: this.model,
      temperature: 0.2, // Slightly higher for more natural splits
      maxTokens: 4096
    });

    const parsed = typeof response === 'string' ? JSON.parse(response) : response;
    
    if (!parsed || !Array.isArray(parsed.splits)) {
      throw new Error('Invalid LLM response format');
    }

    // Validate and clean splits
    // Xác thực và làm sạch các phần chia
    const splits = parsed.splits
      .filter(s => s && typeof s === 'string' && s.trim().length >= minLength)
      .map(s => s.trim());

    if (splits.length === 0) {
      // Fallback to rule-based if LLM returns no valid splits
      // Dự phòng dùng rule-based nếu LLM không trả về splits hợp lệ
      return this._splitWithRules(text, minLength);
    }

    return splits;
  }

  /**
   * Build prompt for paragraph splitting
   * Xây dựng prompt cho việc chia paragraph
   */
  _buildSplitPrompt(text, minLength) {
    return `You are a text analysis system. Your task is to split a long paragraph into smaller, coherent paragraphs.

The paragraph contains multiple sentences, dialogues, and narrative text that should be separated for better readability and text-to-speech processing.

CRITICAL RULES:
1. Split at natural breaks: dialogue changes, speaker changes, topic shifts, or long pauses
2. Each split should be at least ${minLength} characters
3. Preserve dialogue formatting (quotes, etc.)
4. Don't split in the middle of a sentence
5. Don't split in the middle of dialogue
6. Each split should be a complete thought or dialogue exchange

Example splits:
- Before dialogue: "He walked to the door."
- Dialogue: '"Hello," she said.'
- After dialogue: "He turned around."

Paragraph to split:
${text}

Return ONLY a JSON array of strings, where each string is a split paragraph:
{
  "splits": [
    "First paragraph text here.",
    "Second paragraph text here.",
    "Third paragraph text here."
  ]
}

Only respond with JSON, no other text.`;
  }

  /**
   * Split paragraph using rule-based approach (fallback)
   * Chia paragraph sử dụng cách tiếp cận dựa trên quy tắc (dự phòng)
   * 
   * @param {string} text - Paragraph text
   * @param {number} minLength - Minimum length per split
   * @returns {Array<string>} Array of split text segments
   */
  _splitWithRules(text, minLength) {
    const splits = [];
    const sentences = this._splitIntoSentences(text);
    
    let currentSplit = '';
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const potentialSplit = currentSplit + (currentSplit ? ' ' : '') + sentence;
      
      // Check for natural break points
      // Kiểm tra các điểm ngắt tự nhiên
      const hasDialogueBreak = sentence.match(/["'"]/); // Dialogue quotes
      const hasSpeakerChange = sentence.match(/^(said|asked|replied|answered|exclaimed|whispered|shouted|muttered|thought)/i);
      const isLongEnough = potentialSplit.length >= minLength;
      
      // Split if we have a natural break and enough content
      // Chia nếu có điểm ngắt tự nhiên và đủ nội dung
      if ((hasDialogueBreak || hasSpeakerChange || isLongEnough) && currentSplit.length >= minLength) {
        splits.push(currentSplit.trim());
        currentSplit = sentence;
      } else {
        currentSplit = potentialSplit;
      }
    }
    
    // Add remaining text
    // Thêm text còn lại
    if (currentSplit.trim().length >= minLength) {
      splits.push(currentSplit.trim());
    } else if (splits.length > 0) {
      // Merge last split if too short
      // Gộp phần chia cuối nếu quá ngắn
      splits[splits.length - 1] += ' ' + currentSplit.trim();
    } else {
      // If no splits created, return original
      // Nếu không tạo được splits, trả về bản gốc
      splits.push(text.trim());
    }
    
    return splits;
  }

  /**
   * Split text into sentences
   * Chia text thành các câu
   * 
   * @param {string} text - Text to split
   * @returns {Array<string>} Array of sentences
   */
  _splitIntoSentences(text) {
    // Simple sentence splitting (can be improved with better NLP)
    // Chia câu đơn giản (có thể cải thiện với NLP tốt hơn)
    const sentenceEndings = /([.!?]+["']?)\s+/g;
    const sentences = [];
    let lastIndex = 0;
    let match;
    
    while ((match = sentenceEndings.exec(text)) !== null) {
      const sentence = text.substring(lastIndex, match.index + match[1].length).trim();
      if (sentence) {
        sentences.push(sentence);
      }
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    // Thêm text còn lại
    const remaining = text.substring(lastIndex).trim();
    if (remaining) {
      sentences.push(remaining);
    }
    
    return sentences.length > 0 ? sentences : [text];
  }
}

let paragraphSplitterServiceInstance = null;

/**
 * Get singleton paragraph splitter service instance
 * Lấy instance dịch vụ chia paragraph đơn
 */
export function getParagraphSplitterService(model = null, ollamaURL = null) {
  if (!paragraphSplitterServiceInstance) {
    paragraphSplitterServiceInstance = new ParagraphSplitterService(model, ollamaURL);
  }
  return paragraphSplitterServiceInstance;
}

