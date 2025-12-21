/**
 * Authentication API Service
 */
import apiClient from './api';
import type { AxiosResponse } from 'axios';

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      name?: string;
      status: string;
    };
    token: string;
  };
  error?: string;
}

export interface UserResponse {
  success: boolean;
  data?: {
    id: string;
    email: string;
    name?: string;
    status: string;
    created_at: string;
    last_login?: string;
  };
  error?: string;
}

/**
 * Register a new user
 */
export async function register(request: RegisterRequest): Promise<AuthResponse> {
  const response: AxiosResponse<AuthResponse> = await apiClient.post('/api/auth/register', request);
  return response.data;
}

/**
 * Login user
 */
export async function login(request: LoginRequest): Promise<AuthResponse> {
  const response: AxiosResponse<AuthResponse> = await apiClient.post('/api/auth/login', request);
  return response.data;
}

/**
 * Logout user
 */
export async function logout(): Promise<{ success: boolean }> {
  const response = await apiClient.post('/api/auth/logout');
  return response.data;
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<UserResponse> {
  const response: AxiosResponse<UserResponse> = await apiClient.get('/api/auth/me');
  return response.data;
}

/**
 * Verify email
 */
export async function verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
  const response = await apiClient.post('/api/auth/verify', { token });
  return response.data;
}

