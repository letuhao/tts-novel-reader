/**
 * Text Splitter - Split text into sentences for incremental processing
 */

/**
 * Split text into sentences
 * Handles common sentence endings: . ! ? and their combinations
 */
export function splitIntoSentences(text: string): string[] {
  // Remove extra whitespace
  const cleaned = text.trim().replace(/\s+/g, ' ');
  
  // Split by sentence endings, but keep the punctuation
  // Pattern: sentence ending followed by space and capital letter, or end of string
  const sentenceRegex = /([.!?]+)\s+(?=[A-Z])|([.!?]+)$/g;
  
  const sentences: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  // Reset regex
  sentenceRegex.lastIndex = 0;
  
  while ((match = sentenceRegex.exec(cleaned)) !== null) {
    const endIndex = match.index + match[0].length;
    const sentence = cleaned.substring(lastIndex, endIndex).trim();
    
    if (sentence.length > 0) {
      sentences.push(sentence);
    }
    
    lastIndex = endIndex;
  }
  
  // Add remaining text if any
  if (lastIndex < cleaned.length) {
    const remaining = cleaned.substring(lastIndex).trim();
    if (remaining.length > 0) {
      sentences.push(remaining);
    }
  }
  
  // If no sentences found, return the whole text as one sentence
  if (sentences.length === 0) {
    return [cleaned];
  }
  
  return sentences;
}

/**
 * Split text into chunks of approximately equal size
 * Useful for TTS where we want to limit chunk size
 */
export function splitIntoChunks(text: string, maxChunkLength: number = 200): string[] {
  const sentences = splitIntoSentences(text);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    // If adding this sentence would exceed max length, start a new chunk
    if (currentChunk.length + sentence.length + 1 > maxChunkLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    }
  }
  
  // Add remaining chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.length > 0 ? chunks : [text];
}

