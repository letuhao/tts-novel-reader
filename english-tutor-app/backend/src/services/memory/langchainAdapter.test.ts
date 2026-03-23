/**
 * LangChain Memory Adapter Unit Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { LangChainMemoryAdapter } from './langchainAdapter.js';
import type { MemoryServiceConfig } from './types.js';

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('LangChainMemoryAdapter', () => {
  let adapter: LangChainMemoryAdapter;
  let config: MemoryServiceConfig;

  beforeEach(() => {
    config = {
      conversationId: 'conv-123',
      userId: 'user-123',
      strategy: 'sliding',
      maxContextTokens: 1000,
    };

    adapter = new LangChainMemoryAdapter(config);
  });

  describe('saveContext', () => {
    it('should save conversation context', async () => {
      await adapter.saveContext('Hello!', 'Hi there!');

      const context = await adapter.loadMemoryVariables();
      expect(context.messages).toHaveLength(2);
      expect(context.messages[0]?.content).toBe('Hello!');
      expect(context.messages[1]?.content).toBe('Hi there!');
    });

    it('should save multiple conversation turns', async () => {
      await adapter.saveContext('Hello!', 'Hi there!');
      await adapter.saveContext('How are you?', 'I am doing well!');

      const context = await adapter.loadMemoryVariables();
      expect(context.messages).toHaveLength(4);
    });
  });

  describe('loadMemoryVariables', () => {
    it('should load empty memory for new conversation', async () => {
      const context = await adapter.loadMemoryVariables();

      expect(context.messages).toHaveLength(0);
      expect(context.tokenCount).toBe(0);
    });

    it('should load messages with correct roles', async () => {
      await adapter.saveContext('Hello!', 'Hi there!');

      const context = await adapter.loadMemoryVariables();

      expect(context.messages[0]?.role).toBe('user');
      expect(context.messages[1]?.role).toBe('assistant');
    });
  });

  describe('token management', () => {
    it('should trim messages when over token limit', async () => {
      // Create adapter with small token limit
      const smallAdapter = new LangChainMemoryAdapter({
        ...config,
        maxContextTokens: 100, // ~400 characters
      });

      // Add many messages
      for (let i = 0; i < 10; i++) {
        await smallAdapter.saveContext(
          `User message ${i} with some content to make it longer`,
          `Assistant response ${i} with some content to make it longer`
        );
      }

      const context = await smallAdapter.loadMemoryVariables();
      const tokenCount = await smallAdapter.getTokenCount();

      // Should be trimmed to fit within limit
      expect(tokenCount).toBeLessThanOrEqual(150); // Some buffer
    });

    it('should calculate token count correctly', async () => {
      await adapter.saveContext('Hello!', 'Hi there!');

      const tokenCount = await adapter.getTokenCount();
      expect(tokenCount).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear all memory', async () => {
      await adapter.saveContext('Hello!', 'Hi there!');
      await adapter.clear();

      const context = await adapter.loadMemoryVariables();
      expect(context.messages).toHaveLength(0);
      expect(context.tokenCount).toBe(0);
    });
  });

  describe('getSummary', () => {
    it('should return null when no summary exists', async () => {
      const summary = await adapter.getSummary();
      expect(summary).toBeNull();
    });
  });
});

