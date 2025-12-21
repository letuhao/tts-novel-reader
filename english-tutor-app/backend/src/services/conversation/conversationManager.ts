/**
 * Conversation Manager
 * Manages active conversations, WebSocket connections, and state synchronization
 */
import { logger } from '../../utils/logger.js';
import { conversationService } from './conversationService.js';
import { getWebSocketService } from '../websocket/websocketService.js';
import type { Conversation, UpdateConversationInput } from '../../repositories/types.js';

export interface ActiveConversation {
  conversationId: string;
  userId: string;
  conversation: Conversation;
  connectedClients: Set<string>; // WebSocket client IDs
  lastActivity: Date;
  createdAt: Date;
}

export class ConversationManager {
  private activeConversations: Map<string, ActiveConversation> = new Map();
  private userConversations: Map<string, Set<string>> = new Map(); // userId -> Set<conversationId>

  /**
   * Get or create active conversation
   */
  async getOrCreateActiveConversation(
    conversationId: string,
    userId: string
  ): Promise<ActiveConversation> {
    let active = this.activeConversations.get(conversationId);

    if (!active) {
      // Load conversation from database
      const conversation = await conversationService.getConversation(conversationId, false);
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      if (conversation.userId !== userId) {
        throw new Error('Unauthorized: Conversation does not belong to user');
      }

      active = {
        conversationId,
        userId,
        conversation,
        connectedClients: new Set(),
        lastActivity: new Date(),
        createdAt: new Date(),
      };

      this.activeConversations.set(conversationId, active);

      // Track user's active conversations
      if (!this.userConversations.has(userId)) {
        this.userConversations.set(userId, new Set());
      }
      this.userConversations.get(userId)!.add(conversationId);

      logger.info(
        {
          conversationId,
          userId,
        },
        'Active conversation created'
      );
    }

    return active;
  }

  /**
   * Register WebSocket client for conversation
   */
  registerClient(conversationId: string, clientId: string): void {
    const active = this.activeConversations.get(conversationId);
    if (active) {
      active.connectedClients.add(clientId);
      active.lastActivity = new Date();

      logger.debug(
        {
          conversationId,
          clientId,
          totalClients: active.connectedClients.size,
        },
        'Client registered for conversation'
      );
    }
  }

  /**
   * Unregister WebSocket client from conversation
   */
  unregisterClient(conversationId: string, clientId: string): void {
    const active = this.activeConversations.get(conversationId);
    if (active) {
      active.connectedClients.delete(clientId);
      active.lastActivity = new Date();

      // If no clients connected, mark for cleanup (but don't remove yet)
      if (active.connectedClients.size === 0) {
        logger.debug(
          {
            conversationId,
          },
          'No clients connected, conversation idle'
        );
      }

      logger.debug(
        {
          conversationId,
          clientId,
          remainingClients: active.connectedClients.size,
        },
        'Client unregistered from conversation'
      );
    }
  }

  /**
   * Get active conversation
   */
  getActiveConversation(conversationId: string): ActiveConversation | null {
    return this.activeConversations.get(conversationId) || null;
  }

  /**
   * Get all active conversations for a user
   */
  getUserActiveConversations(userId: string): ActiveConversation[] {
    const conversationIds = this.userConversations.get(userId);
    if (!conversationIds) {
      return [];
    }

    return Array.from(conversationIds)
      .map((id) => this.activeConversations.get(id))
      .filter((active): active is ActiveConversation => active !== undefined);
  }

  /**
   * Update conversation state
   */
  async updateConversationState(
    conversationId: string,
    updates: UpdateConversationInput
  ): Promise<void> {
    const active = this.activeConversations.get(conversationId);
    if (active) {
      // Update in database
      const updated = await conversationService.updateConversation(conversationId, updates);
      if (updated) {
        active.conversation = updated;
        active.lastActivity = new Date();

        // Broadcast update to connected clients
        const wsService = getWebSocketService();
        wsService.broadcastToConversation(conversationId, {
          type: 'conversation:updated',
          data: {
            conversationId,
            updates,
          },
          timestamp: new Date().toISOString(),
        });

        logger.debug(
          {
            conversationId,
            updates: Object.keys(updates),
          },
          'Conversation state updated'
        );
      }
    }
  }

  /**
   * Cleanup idle conversations (no clients for X minutes)
   */
  cleanupIdleConversations(idleMinutes = 30): number {
    const now = new Date();
    const idleThreshold = idleMinutes * 60 * 1000; // Convert to milliseconds

    let cleaned = 0;
    for (const [conversationId, active] of this.activeConversations.entries()) {
      const idleTime = now.getTime() - active.lastActivity.getTime();

      if (active.connectedClients.size === 0 && idleTime > idleThreshold) {
        this.activeConversations.delete(conversationId);

        // Remove from user's active conversations
        const userConversations = this.userConversations.get(active.userId);
        if (userConversations) {
          userConversations.delete(conversationId);
          if (userConversations.size === 0) {
            this.userConversations.delete(active.userId);
          }
        }

        cleaned++;
        logger.debug(
          {
            conversationId,
            idleMinutes: Math.floor(idleTime / 60000),
          },
          'Cleaned up idle conversation'
        );
      }
    }

    if (cleaned > 0) {
      logger.info({ cleaned }, 'Cleaned up idle conversations');
    }

    return cleaned;
  }

  /**
   * Get statistics
   */
  getStats(): {
    activeConversations: number;
    totalClients: number;
    usersWithActiveConversations: number;
  } {
    let totalClients = 0;
    for (const active of this.activeConversations.values()) {
      totalClients += active.connectedClients.size;
    }

    return {
      activeConversations: this.activeConversations.size,
      totalClients,
      usersWithActiveConversations: this.userConversations.size,
    };
  }
}

// Export singleton instance
export const conversationManager = new ConversationManager();

// Cleanup idle conversations every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    conversationManager.cleanupIdleConversations(30);
  }, 10 * 60 * 1000);
}

