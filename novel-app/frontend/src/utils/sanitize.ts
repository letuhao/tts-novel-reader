/**
 * Text Sanitization Utility
 * Prevents XSS attacks by sanitizing user content
 * 
 * For this application, we're rendering plain text paragraphs,
 * so we just need to escape HTML special characters.
 */

/**
 * Escapes HTML special characters to prevent XSS
 * @param text - The text to sanitize
 * @returns Sanitized text safe for rendering
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Sanitizes text for safe rendering
 * Currently just escapes HTML, but can be extended for more sanitization
 * @param text - The text to sanitize
 * @returns Sanitized text
 */
export function sanitizeText(text: string): string {
  if (!text) return ''
  return escapeHtml(text)
}

/**
 * Sanitizes an array of text lines
 * @param lines - Array of text lines to sanitize
 * @returns Array of sanitized text lines
 */
export function sanitizeLines(lines: string[] | null): string[] {
  if (!lines || !Array.isArray(lines)) return []
  return lines.map(sanitizeText)
}

