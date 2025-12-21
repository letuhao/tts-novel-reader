/**
 * Ollama Service - Integration with Ollama API for English Tutoring
 * Handles conversation, grammar analysis, exercise generation, and feedback
 */
import axios, { type AxiosInstance } from 'axios';
import type { OllamaMessage, OllamaChatRequest, OllamaChatResponse } from '../../types/index.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger({ service: 'ollama' });

export interface OllamaServiceOptions {
  baseURL?: string;
  model?: string;
  timeout?: number;
}

export interface ChatOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
}

export interface GrammarAnalysisResult {
  errors: Array<{
    type: string;
    position: number;
    correction: string;
    explanation: string;
  }>;
  correctedText: string;
  overallScore: number;
  feedback: string;
}

/**
 * Ollama Service Class
 * Provides methods to interact with Ollama API for English tutoring tasks
 */
export class OllamaService {
  private readonly client: AxiosInstance;
  private readonly baseURL: string;
  private readonly defaultModel: string;
  private readonly timeout: number;

  constructor(options: OllamaServiceOptions = {}) {
    this.baseURL = options.baseURL ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    this.defaultModel = options.model ?? process.env.OLLAMA_DEFAULT_MODEL ?? 'gemma3:12b';
    this.timeout = options.timeout ?? Number.parseInt(process.env.OLLAMA_TIMEOUT ?? '60000', 10);

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Check if Ollama service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/tags');
      return response.status === 200;
    } catch (error) {
      logger.error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Ollama service not available'
      );
      return false;
    }
  }

  /**
   * Check if the specified model is available
   */
  async isModelAvailable(model?: string): Promise<boolean> {
    try {
      const response = await this.client.get('/api/tags');
      const models = (response.data.models as Array<{ name: string }>) ?? [];
      const modelName = model ?? this.defaultModel;
      const isAvailable = models.some((m) => m.name === modelName);
      logger.debug({ modelName, isAvailable }, 'Model availability check');
      return isAvailable;
    } catch (error) {
      logger.error(
        { err: error instanceof Error ? error : new Error(String(error)), model },
        'Error checking model availability'
      );
      return false;
    }
  }

  /**
   * Chat with Ollama (conversation)
   */
  async chat(
    messages: OllamaMessage[],
    options: ChatOptions = {}
  ): Promise<OllamaChatResponse> {
    const request: OllamaChatRequest = {
      model: this.defaultModel,
      messages,
      stream: options.stream ?? false,
      options: {
        temperature: options.temperature ?? 0.7,
        top_p: options.top_p ?? 0.9,
        top_k: options.top_k ?? 40,
      },
    };

    try {
      logger.debug({ model: request.model, messageCount: messages.length }, 'Sending chat request to Ollama');
      const response = await this.client.post<OllamaChatResponse>('/api/chat', request);
      logger.debug({ done: response.data.done }, 'Received response from Ollama');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response !== undefined) {
          logger.error(
            {
              status: error.response.status,
              statusText: error.response.statusText,
              data: error.response.data,
            },
            'Ollama API error'
          );
          throw new Error(
            `Ollama API error: ${error.response.status} - ${(error.response.data as { error?: string })?.error ?? error.message}`
          );
        }
        if (error.request !== undefined) {
          logger.error({ err: error }, 'Ollama connection error');
          throw new Error(`Ollama connection error: ${error.message}`);
        }
      }
      logger.error({ err: error }, 'Ollama error');
      throw new Error(`Ollama error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a conversation response as English tutor
   */
  async tutorConversation(
    studentMessage: string,
    conversationHistory: OllamaMessage[] = [],
    structured: boolean = true
  ): Promise<string> {
    const systemMessage: OllamaMessage = structured
      ? {
          role: 'system',
          content: `You are a friendly, patient, and encouraging English tutor. 
Your role is to help students learn English through natural conversation.
- Be supportive and positive
- Correct errors gently and explain clearly
- Use appropriate language for the student's level
- Ask questions to encourage practice
- Provide examples when helpful

When responding, ALWAYS format your response as JSON with this EXACT structure:

{
  "chunks": [
    {
      "text": "Your sentence or phrase here",
      "emotion": "happy|encouraging|neutral|excited|calm",
      "icon": "😊",
      "pause": 0.5,
      "emphasis": false
    }
  ],
  "metadata": {
    "totalChunks": 1,
    "estimatedDuration": 3.0,
    "tone": "friendly",
    "language": "en"
  }
}

Rules:
1. Split your response into natural chunks (1-3 sentences each, max 200 chars)
2. Add appropriate emotions and icons to each chunk
3. Set pause duration between chunks (0.3-1.0 seconds)
4. Mark important chunks with emphasis: true
5. Return ONLY valid JSON, no other text before or after
6. Ensure all chunks are complete sentences or meaningful phrases
7. Keep chunks conversational and natural

Return your response as JSON only.`,
        }
      : {
          role: 'system',
          content: `You are a friendly, patient, and encouraging English tutor. 
Your role is to help students learn English through natural conversation.
- Be supportive and positive
- Correct errors gently and explain clearly
- Use appropriate language for the student's level
- Ask questions to encourage practice
- Provide examples when helpful`,
        };

    const messages: OllamaMessage[] = [
      systemMessage,
      ...conversationHistory,
      {
        role: 'user',
        content: studentMessage,
      },
    ];

    const response = await this.chat(messages, {
      temperature: structured ? 0.3 : 0.7, // Lower temperature for more consistent JSON
    });

    return response.message.content;
  }

  /**
   * Analyze grammar in student text
   */
  async analyzeGrammar(text: string): Promise<GrammarAnalysisResult> {
    const prompt = `Analyze the following English text for grammatical errors.
Provide corrections and explanations in JSON format.

Text: "${text}"

Respond with a JSON object containing:
{
  "errors": [
    {
      "type": "error type (e.g., 'verb', 'tense', 'article')",
      "position": character position of error,
      "correction": "corrected version",
      "explanation": "brief explanation"
    }
  ],
  "correctedText": "full corrected text",
  "overallScore": score from 0 to 100,
  "feedback": "overall feedback message"
}`;

    const systemMessage: OllamaMessage = {
      role: 'system',
      content: 'You are an expert English grammar teacher. Always respond with valid JSON only.',
    };

    const messages: OllamaMessage[] = [
      systemMessage,
      {
        role: 'user',
        content: prompt,
      },
    ];

    try {
      const response = await this.chat(messages, {
        temperature: 0.1, // Lower temperature for more consistent JSON
        top_p: 0.9,
      });

      // Try to parse JSON from response
      let jsonStr = response.message.content.trim();

      // Remove markdown code blocks if present
      if (jsonStr.includes('```')) {
        const start = jsonStr.indexOf('{');
        const end = jsonStr.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          jsonStr = jsonStr.substring(start, end + 1);
        }
      }

      const result = JSON.parse(jsonStr) as GrammarAnalysisResult;
      logger.debug({ errorCount: result.errors.length, score: result.overallScore }, 'Grammar analysis completed');
      return result;
    } catch (error) {
      logger.error({ err: error, text }, 'Error parsing grammar analysis result');
      // Return a fallback result
      return {
        errors: [],
        correctedText: text,
        overallScore: 100,
        feedback: 'Unable to analyze grammar. Please try again.',
      };
    }
  }

  /**
   * Generate exercise for a specific topic and level
   */
  async generateExercise(
    topic: string,
    level: string,
    exerciseType: string = 'multiple-choice'
  ): Promise<unknown> {
    const prompt = `Generate a ${level} level ${exerciseType} exercise about ${topic}.
Return the exercise in JSON format with:
{
  "question": "exercise question",
  "options": ["option1", "option2", "option3", "option4"],
  "correctAnswer": "correct option",
  "explanation": "brief explanation"
}`;

    const systemMessage: OllamaMessage = {
      role: 'system',
      content: 'You are an expert English teacher creating educational exercises. Always respond with valid JSON only.',
    };

    const messages: OllamaMessage[] = [
      systemMessage,
      {
        role: 'user',
        content: prompt,
      },
    ];

    try {
      const response = await this.chat(messages, {
        temperature: 0.3,
      });

      let jsonStr = response.message.content.trim();
      if (jsonStr.includes('```')) {
        const start = jsonStr.indexOf('{');
        const end = jsonStr.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          jsonStr = jsonStr.substring(start, end + 1);
        }
      }

      const exercise = JSON.parse(jsonStr) as unknown;
      logger.debug({ topic, level, exerciseType }, 'Exercise generated successfully');
      return exercise;
    } catch (error) {
      logger.error({ err: error, topic, level, exerciseType }, 'Error generating exercise');
      throw new Error('Failed to generate exercise');
    }
  }

  /**
   * Provide feedback on student answer
   */
  async provideFeedback(
    question: string,
    studentAnswer: string,
    correctAnswer: string
  ): Promise<string> {
    const prompt = `A student answered the following question:

Question: "${question}"
Student's Answer: "${studentAnswer}"
Correct Answer: "${correctAnswer}"

Provide encouraging and constructive feedback. Be positive, explain any mistakes clearly, and suggest improvements.`;

    const systemMessage: OllamaMessage = {
      role: 'system',
      content: 'You are a supportive English tutor providing feedback to students.',
    };

    const messages: OllamaMessage[] = [
      systemMessage,
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await this.chat(messages, {
      temperature: 0.7,
    });

    logger.debug({ question, hasCorrectAnswer: correctAnswer !== undefined }, 'Feedback provided');
    return response.message.content;
  }
}

// Singleton instance
let ollamaServiceInstance: OllamaService | null = null;

/**
 * Get or create Ollama service singleton instance
 */
export function getOllamaService(options?: OllamaServiceOptions): OllamaService {
  if (ollamaServiceInstance === null) {
    ollamaServiceInstance = new OllamaService(options);
  }
  return ollamaServiceInstance;
}

