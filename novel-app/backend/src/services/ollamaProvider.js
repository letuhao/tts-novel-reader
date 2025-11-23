/**
 * Ollama Provider - Reusable service for communicating with Ollama API
 * Ollama Provider - Dịch vụ tái sử dụng để giao tiếp với Ollama API
 */
import axios from 'axios';

export class OllamaProvider {
  /**
   * Initialize Ollama provider
   * Khởi tạo Ollama provider
   * 
   * @param {string} baseURL - Ollama API base URL (default: http://localhost:11434)
   * @param {string} model - Default model name (default: qwen3:8b)
   */
  constructor(baseURL = 'http://localhost:11434', model = 'qwen3:8b') {
    this.baseURL = baseURL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.defaultModel = model || process.env.OLLAMA_DEFAULT_MODEL || 'qwen3:8b';
    this.apiURL = `${this.baseURL}/api/generate`;
    this.tagsURL = `${this.baseURL}/api/tags`;
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT || '600000'); // 10 minutes default (600s = 600000ms) - no timeout for role detection
  }

  /**
   * Check if Ollama is available
   * Kiểm tra Ollama có sẵn không
   * 
   * @returns {Promise<boolean>} True if Ollama is available
   */
  async isAvailable() {
    try {
      const response = await axios.get(this.tagsURL, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.error('[OllamaProvider] Ollama not available:', error.message);
      return false;
    }
  }

  /**
   * Check if model is available
   * Kiểm tra model có sẵn không
   * 
   * @param {string} modelName - Model name to check
   * @returns {Promise<boolean>} True if model is available
   */
  async isModelAvailable(modelName = null) {
    try {
      const response = await axios.get(this.tagsURL, {
        timeout: 5000
      });
      const models = response.data.models || [];
      const model = modelName || this.defaultModel;
      return models.some(m => m.name === model);
    } catch (error) {
      console.error('[OllamaProvider] Error checking model:', error.message);
      return false;
    }
  }

  /**
   * Generate completion using Ollama
   * Tạo completion sử dụng Ollama
   * 
   * @param {string} prompt - Prompt text
   * @param {Object} options - Generation options
   * @param {string} options.model - Model name (default: defaultModel)
   * @param {number} options.temperature - Temperature (0-1, default: 0.7)
   * @param {number} options.maxTokens - Maximum tokens to generate (default: 2000)
   * @param {boolean} options.stream - Stream response (default: false)
   * @param {string} options.format - Response format ('json' or null)
   * @returns {Promise<string>} Generated response text
   */
  async generate(prompt, options = {}) {
    const {
      model = this.defaultModel,
      temperature = 0.7,
      maxTokens = 2000,
      stream = false,
      format = null
    } = options;

    try {
      const requestBody = {
        model: model,
        prompt: prompt,
        stream: stream,
        options: {
          temperature: temperature,
          num_predict: maxTokens
        }
      };

      // Add format if specified
      if (format) {
        requestBody.format = format;
      }

      const response = await axios.post(
        this.apiURL,
        requestBody,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (stream) {
        // Handle streaming response
        // For now, return full response
        return response.data;
      }

      return response.data.response || '';
    } catch (error) {
      if (error.response) {
        throw new Error(`Ollama API error: ${error.response.status} - ${error.response.data?.error || error.message}`);
      } else if (error.request) {
        throw new Error(`Ollama connection error: ${error.message}`);
      } else {
        throw new Error(`Ollama error: ${error.message}`);
      }
    }
  }

  /**
   * Generate JSON response using Ollama
   * Tạo JSON response sử dụng Ollama
   * 
   * @param {string} prompt - Prompt text
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Parsed JSON response
   */
  async generateJSON(prompt, options = {}) {
    const response = await this.generate(prompt, {
      ...options,
      format: 'json',
      temperature: options.temperature || 0.1 // Lower temperature for JSON
    });

    try {
      // Try to parse JSON from response
      let jsonStr = response.trim();
      
      // Remove markdown code blocks if present
      if (jsonStr.includes('```')) {
        const start = jsonStr.indexOf('{');
        const end = jsonStr.lastIndexOf('}') + 1;
        if (start !== -1 && end > 0) {
          jsonStr = jsonStr.substring(start, end);
        }
      }

      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('[OllamaProvider] JSON parse error:', error.message);
      console.error('[OllamaProvider] Response:', response.substring(0, 500));
      throw new Error(`Failed to parse JSON response: ${error.message}`);
    }
  }

  /**
   * Chat completion (conversational format)
   * Chat completion (định dạng hội thoại)
   * 
   * @param {Array<Object>} messages - Array of messages [{role: 'user', content: '...'}]
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Generated response
   */
  async chat(messages, options = {}) {
    const {
      model = this.defaultModel,
      temperature = 0.7,
      maxTokens = 2000
    } = options;

    // Convert messages to prompt
    const prompt = messages.map(msg => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      return `${role}: ${msg.content}`;
    }).join('\n\n') + '\n\nAssistant:';

    return await this.generate(prompt, {
      model,
      temperature,
      maxTokens
    });
  }
}

// Singleton instance / Instance đơn
let ollamaProviderInstance = null;

/**
 * Get singleton Ollama provider instance
 * Lấy instance Ollama provider đơn
 * 
 * @param {string} baseURL - Base URL (only used on first call)
 * @param {string} model - Default model (only used on first call)
 * @returns {OllamaProvider} Provider instance
 */
export function getOllamaProvider(baseURL = null, model = null) {
  if (!ollamaProviderInstance) {
    ollamaProviderInstance = new OllamaProvider(baseURL, model);
  }
  return ollamaProviderInstance;
}

