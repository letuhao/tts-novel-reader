/**
 * Novel Structure Detection Service - LLM-based structure analysis
 * Dịch vụ Phát hiện Cấu trúc Novel - Phân tích cấu trúc dựa trên LLM
 * 
 * Uses Ollama to intelligently detect novel structure (chapters, prologue, epilogue, parts, etc.)
 * Sử dụng Ollama để phát hiện cấu trúc novel thông minh (chapters, prologue, epilogue, parts, etc.)
 */
import { getOllamaProvider } from './ollamaProvider.js';

export class NovelStructureDetectionService {
  /**
   * Initialize structure detection service
   * Khởi tạo dịch vụ phát hiện cấu trúc
   * 
   * @param {string} model - Ollama model name (default: qwen3:8b)
   * @param {string} ollamaURL - Ollama base URL
   */
  constructor(model = 'qwen3:8b', ollamaURL = null) {
    this.model = model || process.env.OLLAMA_DEFAULT_MODEL || 'qwen3:8b';
    this.ollama = getOllamaProvider(ollamaURL, this.model);
  }

  /**
   * Detect novel structure using LLM
   * Phát hiện cấu trúc novel sử dụng LLM
   * 
   * @param {string} content - Full novel content
   * @param {Object} options - Detection options
   * @returns {Promise<Object>} Structure index with markers
   */
  async detectStructure(content, options = {}) {
    const {
      sampleSize = 10000,  // Sample size for analysis (first N lines) - increased for better detection
      maxMarkers = 200,   // Maximum number of structure markers to detect
      language = 'auto'   // Language hint: 'auto', 'en', 'vi', etc.
    } = options;

    try {
      console.log('[NovelStructureDetection] Starting structure detection...');
      console.log('[NovelStructureDetection] Bắt đầu phát hiện cấu trúc...');
      
      // Normalize content: handle form feed characters and other control characters
      // Chuẩn hóa nội dung: xử lý form feed characters và các ký tự điều khiển khác
      // Form feed (\f) often appears in Calibre exports and should be treated as line breaks
      // Form feed (\f) thường xuất hiện trong Calibre exports và nên được xử lý như line breaks
      const normalizedContent = content
        .replace(/\f/g, '\n')  // Replace form feed with newline
        .replace(/\r\n/g, '\n') // Normalize Windows line endings
        .replace(/\r/g, '\n');  // Normalize Mac line endings
      
      const lines = normalizedContent.split('\n');
      const totalLines = lines.length;
      
      console.log(`[NovelStructureDetection] Content normalized: ${content.length} → ${normalizedContent.length} chars`);
      console.log(`[NovelStructureDetection] Total lines: ${totalLines}`);
      
      // Log first few lines for debugging
      // Log vài dòng đầu để debug
      console.log(`[NovelStructureDetection] First 10 lines preview:`);
      lines.slice(0, 10).forEach((line, idx) => {
        const preview = line.substring(0, 80).replace(/[\x00-\x1F]/g, '?'); // Replace control chars
        console.log(`[NovelStructureDetection]   Line ${idx + 1}: "${preview}${line.length > 80 ? '...' : ''}"`);
      });
      
      // Strategy: Use regex to scan ENTIRE file (no token limits), LLM only for structure understanding
      // Chiến lược: Dùng regex quét TOÀN BỘ file (không giới hạn token), LLM chỉ để hiểu cấu trúc
      
      console.log(`[NovelStructureDetection] File size: ${totalLines} lines, ${normalizedContent.length} characters`);
      console.log(`[NovelStructureDetection] Kích thước file: ${totalLines} dòng, ${normalizedContent.length} ký tự`);
      
      // Step 1: Always scan ENTIRE file with regex first (fast, no token limits, finds all markers)
      // Bước 1: Luôn quét TOÀN BỘ file bằng regex trước (nhanh, không giới hạn token, tìm tất cả markers)
      console.log(`[NovelStructureDetection] Step 1: Scanning entire file with regex for all markers...`);
      console.log(`[NovelStructureDetection] Bước 1: Đang quét toàn bộ file bằng regex để tìm tất cả markers...`);
      const regexMarkers = this._findMarkersWithRegex(lines, totalLines);
      console.log(`[NovelStructureDetection] ✅ Regex found ${regexMarkers.length} markers in entire file`);
      console.log(`[NovelStructureDetection] ✅ Regex tìm thấy ${regexMarkers.length} markers trong toàn bộ file`);
      
      // Step 2: Use LLM only on a small sample for structure understanding (within token limits)
      // Bước 2: Dùng LLM chỉ trên mẫu nhỏ để hiểu cấu trúc (trong giới hạn token)
      // Limit sample to ~3000 lines to stay well within token limits (~8000 tokens)
      // Giới hạn mẫu ~3000 dòng để ở trong giới hạn token (~8000 tokens)
      const maxSampleLines = Math.min(3000, totalLines);
      const sampleContent = lines.slice(0, maxSampleLines).join('\n');
      const lastLines = lines.slice(-Math.min(200, totalLines)).join('\n');
      
      console.log(`[NovelStructureDetection] Step 2: Using LLM on sample (first ${maxSampleLines} lines + last ${Math.min(200, totalLines)} lines) for structure understanding...`);
      console.log(`[NovelStructureDetection] Bước 2: Dùng LLM trên mẫu (${maxSampleLines} dòng đầu + ${Math.min(200, totalLines)} dòng cuối) để hiểu cấu trúc...`);
      
      let llmStructureType = null;
      let llmConfidence = 0.5;
      let llmNotes = '';
      
      try {
        const prompt = this._buildStructureDetectionPrompt(sampleContent, lastLines, totalLines, language);
        const estimatedTokens = Math.round(prompt.length / 4);
        console.log(`[NovelStructureDetection] Prompt length: ${prompt.length} chars (~${estimatedTokens} tokens)`);
        
        if (estimatedTokens > 15000) {
          console.warn(`[NovelStructureDetection] ⚠️ Prompt too large (${estimatedTokens} tokens), reducing sample size`);
          // Reduce sample size if too large
          const reducedSample = lines.slice(0, Math.min(2000, totalLines)).join('\n');
          const prompt2 = this._buildStructureDetectionPrompt(reducedSample, lastLines, totalLines, language);
          const response = await this.ollama.generateJSON(prompt2, {
            model: this.model,
            temperature: 0.1,
            maxTokens: 4096
          });
          const llmResult = this._parseStructureResponse(response, lines, totalLines);
          llmStructureType = llmResult.structure;
          llmConfidence = llmResult.confidence;
          llmNotes = llmResult.notes || '';
        } else {
          const response = await this.ollama.generateJSON(prompt, {
            model: this.model,
            temperature: 0.1,
            maxTokens: 4096
          });
          const llmResult = this._parseStructureResponse(response, lines, totalLines);
          llmStructureType = llmResult.structure;
          llmConfidence = llmResult.confidence;
          llmNotes = llmResult.notes || '';
        }
        
        console.log(`[NovelStructureDetection] LLM structure type: ${llmStructureType}, confidence: ${llmConfidence}`);
        console.log(`[NovelStructureDetection] Loại cấu trúc LLM: ${llmStructureType}, độ tin cậy: ${llmConfidence}`);
      } catch (llmError) {
        console.warn(`[NovelStructureDetection] ⚠️ LLM analysis failed (token limit or other error), using regex only: ${llmError.message}`);
        console.warn(`[NovelStructureDetection] ⚠️ Phân tích LLM thất bại (giới hạn token hoặc lỗi khác), chỉ dùng regex: ${llmError.message}`);
      }
      
      // Step 3: Merge results - use regex markers (complete), infer structure type
      // Bước 3: Hợp nhất kết quả - dùng regex markers (đầy đủ), suy luận loại cấu trúc
      const inferredStructure = this._inferStructureType(regexMarkers);
      const finalStructureType = llmStructureType || inferredStructure;
      
      const structureIndex = {
        markers: regexMarkers, // Always use regex markers (complete scan of entire file)
        structure: finalStructureType,
        confidence: regexMarkers.length > 0 ? 0.95 : 0.0, // High confidence for regex (accurate pattern matching)
        notes: llmNotes || `Found ${regexMarkers.length} markers using regex pattern matching${llmStructureType ? `, LLM suggests: ${llmStructureType}` : ''}`,
        totalLines: totalLines
      };
      
      console.log(`[NovelStructureDetection] ✅ Final result: ${structureIndex.markers.length} markers, structure: ${structureIndex.structure}, confidence: ${structureIndex.confidence}`);
      console.log(`[NovelStructureDetection] ✅ Kết quả cuối cùng: ${structureIndex.markers.length} markers, cấu trúc: ${structureIndex.structure}, độ tin cậy: ${structureIndex.confidence}`);
      
      return structureIndex;
    } catch (error) {
      console.error('[NovelStructureDetection] Error detecting structure:', error);
      console.error('[NovelStructureDetection] Lỗi phát hiện cấu trúc:', error);
      
      // Fallback: return empty structure (will be treated as single chapter)
      // Dự phòng: trả về cấu trúc rỗng (sẽ được xử lý như một chapter)
      return {
        markers: [],
        structure: 'single-chapter',
        confidence: 0,
        totalLines: content.split('\n').length
      };
    }
  }

  /**
   * Build prompt for structure detection
   * Xây dựng prompt cho phát hiện cấu trúc
   */
  _buildStructureDetectionPrompt(sampleContent, lastLines, totalLines, language) {
    const languageHint = language === 'auto' 
      ? 'The novel may be in English, Vietnamese, or other languages.'
      : `The novel is in ${language}.`;
    
    // Extract first few lines to show in prompt
    // Trích xuất vài dòng đầu để hiển thị trong prompt
    const firstLines = sampleContent.split('\n').slice(0, 30).join('\n');
    
    // Find actual PROLOGUE/Chapter markers in the first lines for examples
    // Tìm các markers PROLOGUE/Chapter thực tế trong các dòng đầu để làm ví dụ
    const exampleLines = firstLines.split('\n');
    let prologueExample = null;
    let chapterExample = null;
    
    for (let i = 0; i < Math.min(exampleLines.length, 50); i++) {
      const line = exampleLines[i].trim();
      if (!prologueExample && (line === 'PROLOGUE' || line === 'Prologue' || line.toUpperCase() === 'PROLOGUE')) {
        prologueExample = {
          lineNumber: i + 1,
          line: line,
          nextLine: exampleLines[i + 1]?.trim() || ''
        };
      }
      if (!chapterExample && /^Chapter\s+\d+/i.test(line)) {
        chapterExample = {
          lineNumber: i + 1,
          line: line
        };
      }
    }
    
    return `You are a novel structure analysis system. Your task is to identify ALL structural markers in the provided novel text.

${languageHint}

CRITICAL INSTRUCTION: If you see the word "PROLOGUE" (all caps) on ANY line by itself, that IS a structural marker. You MUST return it in the markers array.

EXAMPLE FROM THE ACTUAL TEXT:
If the text contains:
Line 1: "Death March to the Parallel World Rhapsody, Vol. 1"
Line 2: "Hiro Ainana"
Line 3: (empty line)
Line 4: (empty line or form feed)
Line 5: "PROLOGUE"
Line 6: "Death March to Disaster"

You MUST return:
{
  "markers": [
    {
      "lineNumber": 5,
      "type": "PROLOGUE",
      "title": "Death March to Disaster",
      "rawLine": "PROLOGUE"
    }
  ],
  "structure": "prologue-chapters",
  "confidence": 0.95
}

DO NOT return empty markers array if you see "PROLOGUE" in the text!
DO NOT say "no explicit marker line" - "PROLOGUE" IS the marker line!

Novel sample (first ${sampleContent.split('\n').length} lines):
${sampleContent.substring(0, 20000)}${sampleContent.length > 20000 ? '...' : ''}

Novel ending sample (last ${Math.min(100, totalLines)} lines):
${lastLines.substring(0, 3000)}${lastLines.length > 3000 ? '...' : ''}

Total lines in novel: ${totalLines}

First 30 lines for reference:
${firstLines}

Structural markers to detect:
- PROLOGUE: Opening section before main story (look for "PROLOGUE" or "Prologue" on its own line)
- CHAPTER: Main story chapters (look for "Chapter 1", "Chapter 2", "CHAPTER 1", etc.)
- PART: Volume/Part divisions (Part 1, Volume 1, Book 1)
- INTERLUDE: Short sections between chapters
- EPILOGUE: Closing section after main story
- AFTERWORD: Author's note or afterword
- OTHER: Other structural elements (preface, introduction, etc.)

CRITICAL INSTRUCTIONS:
1. Scan the ENTIRE sample text line by line for structural markers
2. If you see "PROLOGUE" (all caps) on ANY line by itself, that IS a marker - return it!
3. If you see "Chapter" followed by a number, that IS a marker - return it!
4. Return line numbers (1-based) where structural markers appear
5. Include the marker line itself (e.g., if "PROLOGUE" is on line 5, return lineNumber: 5)
6. The title is often on the NEXT line after the marker (e.g., line 5: "PROLOGUE", line 6: "Title")
7. DO NOT return empty markers array if you see ANY of these words: PROLOGUE, Chapter, Prologue, EPILOGUE, Epilogue, Part, Volume, Interlude
8. Even if you only see ONE marker (like just PROLOGUE), you MUST return it
9. Look for these patterns (case-insensitive):
   - Standalone: "PROLOGUE", "Prologue", "EPILOGUE", "Epilogue"
   - With number: "Chapter 1", "Chapter 2", "CHAPTER 1", "Chương 1"
   - With label: "Part 1", "Volume 1", "Book 1", "Interlude 1"
   - Roman numerals: "I", "II", "III" (often used for chapters)
10. If the text has a PROLOGUE but no chapters, return ONLY the PROLOGUE marker - that's correct!

Response format (JSON only, no other text):
{
  "markers": [
    {
      "lineNumber": 4,
      "type": "PROLOGUE",
      "title": "Death March to Disaster",
      "rawLine": "PROLOGUE"
    },
    {
      "lineNumber": 250,
      "type": "CHAPTER",
      "title": "Chapter 1: Title",
      "rawLine": "Chapter 1: Title"
    },
    {
      "lineNumber": 500,
      "type": "CHAPTER",
      "title": "Chapter 2",
      "rawLine": "Chapter 2"
    }
  ],
  "structure": "prologue-chapters" | "chapters-only" | "single-chapter" | "parts-chapters",
  "confidence": 0.0-1.0,
  "notes": "Optional notes about the structure"
}

Only respond with JSON, no other text.`;
  }

  /**
   * Parse structure detection response
   * Parse response phát hiện cấu trúc
   */
  _parseStructureResponse(response, lines, totalLines) {
    try {
      // Ensure response is an object
      // Đảm bảo response là object
      let parsed;
      if (typeof response === 'string') {
        try {
          parsed = JSON.parse(response);
        } catch (parseError) {
          console.error('[NovelStructureDetection] ❌ Failed to parse JSON response:', parseError.message);
          console.error('[NovelStructureDetection] ❌ Response preview:', response.substring(0, 500));
          throw parseError;
        }
      } else {
        parsed = response;
      }
      
      console.log(`[NovelStructureDetection] Parsed response type: ${typeof parsed}, has markers: ${Array.isArray(parsed?.markers)}`);
      
      if (!parsed || !Array.isArray(parsed.markers)) {
        console.warn('[NovelStructureDetection] ⚠️ Invalid response format, using fallback');
        console.warn('[NovelStructureDetection] ⚠️ Response structure:', Object.keys(parsed || {}));
        if (parsed && typeof parsed === 'object') {
          console.warn('[NovelStructureDetection] ⚠️ Response content:', JSON.stringify(parsed).substring(0, 1000));
        }
        return {
          markers: [],
          structure: 'single-chapter',
          confidence: 0,
          totalLines
        };
      }
      
      console.log(`[NovelStructureDetection] Raw markers from LLM: ${parsed.markers.length}`);
      
      // DEBUG: Log full response if markers array is empty but structure/confidence suggests detection
      if (parsed.markers.length === 0 && parsed.confidence > 0.5) {
        console.error(`[NovelStructureDetection] ❌ ERROR: LLM returned empty markers but confidence=${parsed.confidence}, structure="${parsed.structure}"`);
        console.error(`[NovelStructureDetection] ❌ Full response:`, JSON.stringify(parsed, null, 2).substring(0, 3000));
        console.error(`[NovelStructureDetection] ❌ This suggests the LLM detected structure but didn't populate markers array!`);
      }
      
      if (parsed.markers.length > 0) {
        console.log(`[NovelStructureDetection] First 3 raw markers:`, JSON.stringify(parsed.markers.slice(0, 3), null, 2));
      }
      
      // Validate and normalize markers
      // Xác thực và chuẩn hóa markers
      const markers = parsed.markers
        .filter(m => m.lineNumber && m.lineNumber > 0 && m.lineNumber <= totalLines)
        .map(m => ({
          lineIndex: m.lineNumber - 1,  // Convert to 0-based
          type: m.type || 'CHAPTER',
          title: m.title || m.rawLine || `Chapter ${m.lineNumber}`,
          rawLine: m.rawLine || lines[m.lineNumber - 1]?.trim() || ''
        }))
        .sort((a, b) => a.lineIndex - b.lineIndex);  // Sort by line index
      
      // Remove duplicates (same line index)
      // Loại bỏ trùng lặp (cùng line index)
      const uniqueMarkers = [];
      const seenIndexes = new Set();
      for (const marker of markers) {
        if (!seenIndexes.has(marker.lineIndex)) {
          uniqueMarkers.push(marker);
          seenIndexes.add(marker.lineIndex);
        }
      }
      
      return {
        markers: uniqueMarkers,
        structure: parsed.structure || (uniqueMarkers.length > 0 ? 'chapters-only' : 'single-chapter'),
        confidence: parsed.confidence || (uniqueMarkers.length > 0 ? 0.8 : 0.0),
        notes: parsed.notes || null,
        totalLines
      };
    } catch (error) {
      console.error('[NovelStructureDetection] Error parsing response:', error);
      return {
        markers: [],
        structure: 'single-chapter',
        confidence: 0,
        totalLines
      };
    }
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
   * Fallback: Find markers using regex patterns
   * Dự phòng: Tìm markers sử dụng regex patterns
   * 
   * @param {string[]} lines - Array of lines
   * @param {number} totalLines - Total number of lines
   * @returns {Array} Array of marker objects
   */
  _findMarkersWithRegex(lines, totalLines) {
    const markers = [];
    const patterns = [
      // PROLOGUE patterns
      { pattern: /^PROLOGUE\s*$/i, type: 'PROLOGUE' },
      { pattern: /^Prologue\s*$/i, type: 'PROLOGUE' },
      // CHAPTER patterns
      { pattern: /^Chapter\s+(\d+)(?:\s*[:：]\s*(.+))?$/i, type: 'CHAPTER' },
      { pattern: /^CHAPTER\s+(\d+)(?:\s*[:：]\s*(.+))?$/i, type: 'CHAPTER' },
      { pattern: /^Chương\s+(\d+)(?:\s*[:：]\s*(.+))?$/i, type: 'CHAPTER' },
      // EPILOGUE patterns
      { pattern: /^EPILOGUE\s*$/i, type: 'EPILOGUE' },
      { pattern: /^Epilogue\s*$/i, type: 'EPILOGUE' },
      // PART patterns
      { pattern: /^Part\s+(\d+)/i, type: 'PART' },
      { pattern: /^Volume\s+(\d+)/i, type: 'PART' },
      { pattern: /^Book\s+(\d+)/i, type: 'PART' },
      // INTERLUDE patterns
      { pattern: /^INTERLUDE\s*$/i, type: 'INTERLUDE' },
      { pattern: /^Interlude\s+(\d+)?/i, type: 'INTERLUDE' },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      for (const { pattern, type } of patterns) {
        const match = line.match(pattern);
        if (match) {
          let title = '';
          // Try to get title from next line if it's not empty and not another marker
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            if (nextLine && !nextLine.match(/^(PROLOGUE|Chapter|CHAPTER|EPILOGUE|Part|Volume|Book|Interlude)/i)) {
              title = nextLine;
            }
          }
          
          // Use captured title if available
          if (match[2]) {
            title = match[2];
          } else if (match[1] && type === 'CHAPTER') {
            title = `Chapter ${match[1]}`;
          }

          markers.push({
            lineIndex: i,
            type: type,
            title: title || line,
            rawLine: line
          });
          break; // Found a match, move to next line
        }
      }
    }

    return markers.sort((a, b) => a.lineIndex - b.lineIndex);
  }

  /**
   * Infer structure type from markers
   * Suy luận loại cấu trúc từ markers
   * 
   * @param {Array} markers - Array of marker objects
   * @returns {string} Structure type
   */
  _inferStructureType(markers) {
    if (markers.length === 0) {
      return 'single-chapter';
    }

    const types = new Set(markers.map(m => m.type));
    const hasPrologue = types.has('PROLOGUE');
    const hasEpilogue = types.has('EPILOGUE');
    const hasChapters = types.has('CHAPTER');
    const hasParts = types.has('PART');

    if (hasPrologue && hasChapters && hasEpilogue) {
      return 'prologue-chapters-epilogue';
    } else if (hasPrologue && hasChapters) {
      return 'prologue-chapters';
    } else if (hasChapters && hasEpilogue) {
      return 'chapters-epilogue';
    } else if (hasPrologue && !hasChapters) {
      return 'prologue-only';
    } else if (hasChapters) {
      return 'chapters-only';
    } else if (hasParts && hasChapters) {
      return 'parts-chapters';
    } else {
      return 'mixed';
    }
  }
}

// Singleton instance / Instance đơn
let structureDetectionServiceInstance = null;

/**
 * Get singleton structure detection service instance
 * Lấy instance dịch vụ phát hiện cấu trúc đơn
 */
export function getNovelStructureDetectionService(model = null, ollamaURL = null) {
  if (!structureDetectionServiceInstance) {
    structureDetectionServiceInstance = new NovelStructureDetectionService(model, ollamaURL);
  }
  return structureDetectionServiceInstance;
}

