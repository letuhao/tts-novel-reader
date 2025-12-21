/**
 * Conversation API Service
 */
import apiClient from './api';
import type { AxiosResponse } from 'axios';

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  template_id?: string;
  ai_settings?: Record<string, unknown>;
  status: 'active' | 'archived' | 'deleted';
  created_at: string;
  updated_at: string;
}

export interface CreateConversationRequest {
  title?: string;
  template_id?: string;
  ai_settings?: Record<string, unknown>;
  level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}

export interface UpdateConversationRequest {
  title?: string;
  ai_settings?: Record<string, unknown>;
  status?: 'active' | 'archived' | 'deleted';
}

export interface ConversationResponse {
  success: boolean;
  data?: Conversation;
  error?: string;
}

export interface ConversationsResponse {
  success: boolean;
  data?: {
    conversations: Conversation[];
    total: number;
    page: number;
    pageSize: number;
  };
  error?: string;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  status?: 'active' | 'archived' | 'deleted';
  orderBy?: 'created_at' | 'updated_at' | 'title';
  order?: 'asc' | 'desc';
}

/**
 * Create a new conversation
 */
export async function createConversation(
  request: CreateConversationRequest
): Promise<ConversationResponse> {
  const response: AxiosResponse<ConversationResponse> = await apiClient.post(
    '/api/conversations',
    request
  );
  return response.data;
}

/**
 * Get all conversations for current user
 */
export async function getConversations(
  options?: PaginationOptions
): Promise<ConversationsResponse> {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', options.page.toString());
  if (options?.pageSize) params.append('pageSize', options.pageSize.toString());
  if (options?.status) params.append('status', options.status);
  if (options?.orderBy) params.append('orderBy', options.orderBy);
  if (options?.order) params.append('order', options.order);

  const response: AxiosResponse<ConversationsResponse> = await apiClient.get(
    `/api/conversations?${params.toString()}`
  );
  return response.data;
}

/**
 * Get conversation by ID
 */
export async function getConversation(id: string): Promise<ConversationResponse> {
  const response: AxiosResponse<ConversationResponse> = await apiClient.get(
    `/api/conversations/${id}`
  );
  return response.data;
}

/**
 * Update conversation
 */
export async function updateConversation(
  id: string,
  request: UpdateConversationRequest
): Promise<ConversationResponse> {
  const response: AxiosResponse<ConversationResponse> = await apiClient.put(
    `/api/conversations/${id}`,
    request
  );
  return response.data;
}

/**
 * Delete conversation
 */
export async function deleteConversation(id: string): Promise<{ success: boolean; error?: string }> {
  const response = await apiClient.delete(`/api/conversations/${id}`);
  return response.data;
}

/**
 * Archive conversation
 */
export async function archiveConversation(id: string): Promise<ConversationResponse> {
  return updateConversation(id, { status: 'archived' });
}

/**
 * Restore conversation
 */
export async function restoreConversation(id: string): Promise<ConversationResponse> {
  return updateConversation(id, { status: 'active' });
}

export interface MessageChunk {
  id: string;
  messageId: string;
  chunkIndex: number;
  text: string;
  emotion?: string;
  icon?: string;
  pause?: number;
  emphasis?: boolean;
  audioFileId?: string;
  audioDuration?: number;
  ttsStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export interface MessageWithChunks {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sequenceNumber: number;
  audioFileId?: string;
  audioDuration?: number;
  createdAt: string;
  chunks?: MessageChunk[];
}

export interface MessagesResponse {
  success: boolean;
  data?: {
    messages: MessageWithChunks[];
    total: number;
  };
  error?: string;
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(id: string): Promise<MessagesResponse> {
  const response: AxiosResponse<MessagesResponse> = await apiClient.get(
    `/api/conversations/${id}/messages`
  );
  return response.data;
}

