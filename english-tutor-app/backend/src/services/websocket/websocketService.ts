/**
 * WebSocket Service
 * Manages WebSocket connections and event broadcasting
 */
import { WebSocket, WebSocketServer } from 'ws';
import { logger } from '../../utils/logger.js';
import { IncomingMessage } from 'http';
import { parse } from 'url';

export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp?: string;
  conversationId?: string;
}

export interface ConversationConnection {
  ws: WebSocket;
  conversationId: string;
  userId?: string;
  connectedAt: Date;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private connections: Map<string, ConversationConnection> = new Map();
  private conversationConnections: Map<string, Set<string>> = new Map(); // conversationId -> Set of connectionIds

  /**
   * Initialize WebSocket server
   */
  initialize(server: ReturnType<typeof import('http').createServer>): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      perMessageDeflate: false, // Disable compression for lower latency
    });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    logger.info('WebSocket server initialized on /ws');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const connectionId = this.generateConnectionId();
    const url = parse(req.url ?? '', true);
    const conversationId = (url.query.conversationId as string) ?? 'default';
    const userId = (url.query.userId as string) ?? undefined;

    const connection: ConversationConnection = {
      ws,
      conversationId,
      userId,
      connectedAt: new Date(),
    };

    this.connections.set(connectionId, connection);

    // Track conversation connections
    if (!this.conversationConnections.has(conversationId)) {
      this.conversationConnections.set(conversationId, new Set());
    }
    this.conversationConnections.get(conversationId)?.add(connectionId);

    logger.info(
      {
        connectionId,
        conversationId,
        userId,
        totalConnections: this.connections.size,
      },
      'New WebSocket connection'
    );

    // Send welcome message
    this.sendToConnection(connectionId, {
      type: 'connected',
      data: {
        connectionId,
        conversationId,
        timestamp: new Date().toISOString(),
      },
    });

    // Handle messages from client
    ws.on('message', (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        this.handleMessage(connectionId, message);
      } catch (error) {
        logger.error({ err: error }, 'Error parsing WebSocket message');
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Invalid message format' },
        });
      }
    });

    // Handle connection close
    ws.on('close', () => {
      this.handleDisconnection(connectionId);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error({ err: error, connectionId }, 'WebSocket error');
      this.handleDisconnection(connectionId);
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(connectionId: string, message: WebSocketMessage): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      logger.warn({ connectionId }, 'Message from unknown connection');
      return;
    }

    logger.debug(
      { connectionId, messageType: message.type },
      'Received WebSocket message'
    );

    // Handle ping/pong for keepalive
    if (message.type === 'ping') {
      this.sendToConnection(connectionId, {
        type: 'pong',
        data: { timestamp: new Date().toISOString() },
      });
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  private handleDisconnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove from conversation tracking
    const conversationConnections = this.conversationConnections.get(
      connection.conversationId
    );
    if (conversationConnections) {
      conversationConnections.delete(connectionId);
      if (conversationConnections.size === 0) {
        this.conversationConnections.delete(connection.conversationId);
      }
    }

    this.connections.delete(connectionId);

    logger.info(
      {
        connectionId,
        conversationId: connection.conversationId,
        remainingConnections: this.connections.size,
      },
      'WebSocket connection closed'
    );
  }

  /**
   * Send message to specific connection
   */
  sendToConnection(connectionId: string, message: WebSocketMessage): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      logger.warn({ connectionId }, 'Connection not found');
      return;
    }

    if (connection.ws.readyState === WebSocket.OPEN) {
      const fullMessage: WebSocketMessage = {
        ...message,
        timestamp: message.timestamp ?? new Date().toISOString(),
        conversationId: connection.conversationId,
      };

      connection.ws.send(JSON.stringify(fullMessage));
    } else {
      logger.warn({ connectionId }, 'Connection not open, skipping message');
    }
  }

  /**
   * Broadcast message to all connections in a conversation
   */
  broadcastToConversation(
    conversationId: string,
    message: WebSocketMessage
  ): void {
    const connectionIds = this.conversationConnections.get(conversationId);
    if (!connectionIds || connectionIds.size === 0) {
      logger.debug({ conversationId }, 'No connections for conversation');
      return;
    }

    let sentCount = 0;
    for (const connectionId of connectionIds) {
      if (this.connections.has(connectionId)) {
        this.sendToConnection(connectionId, message);
        sentCount++;
      }
    }

    logger.debug(
      {
        conversationId,
        sentCount,
        totalConnections: connectionIds.size,
      },
      'Broadcasted message to conversation'
    );
  }

  /**
   * Broadcast message to all connections
   */
  broadcast(message: WebSocketMessage): void {
    let sentCount = 0;
    for (const connectionId of this.connections.keys()) {
      this.sendToConnection(connectionId, message);
      sentCount++;
    }

    logger.debug({ sentCount }, 'Broadcasted message to all connections');
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get conversation connection count
   */
  getConversationConnectionCount(conversationId: string): number {
    return this.conversationConnections.get(conversationId)?.size ?? 0;
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Close all connections and cleanup
   */
  close(): void {
    for (const connection of this.connections.values()) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close();
      }
    }
    this.connections.clear();
    this.conversationConnections.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    logger.info('WebSocket server closed');
  }
}

// Singleton instance
let websocketServiceInstance: WebSocketService | null = null;

export function getWebSocketService(): WebSocketService {
  if (!websocketServiceInstance) {
    websocketServiceInstance = new WebSocketService();
  }
  return websocketServiceInstance;
}

