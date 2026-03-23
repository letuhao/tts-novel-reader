/**
 * Auth Service Unit Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  registerUser,
  loginUser,
  verifySession,
  logoutUser,
} from './authService.js';
import { getPool } from '../../database/connection.js';

// Mock database connection
vi.mock('../../database/connection.js', () => ({
  getPool: vi.fn(),
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Auth Service', () => {
  const mockPool = {
    connect: vi.fn(),
    query: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPool).mockReturnValue(mockPool as any);
  });

  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are long
    });

    it('should verify correct password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('wrongpassword', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('Token Generation', () => {
    it('should generate a JWT token', () => {
      const userId = 'user-123';
      const email = 'test@example.com';

      const token = generateToken(userId, email);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should verify a valid token', () => {
      const userId = 'user-123';
      const email = 'test@example.com';

      const token = generateToken(userId, email);
      const decoded = verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(userId);
      expect(decoded?.email).toBe(email);
    });

    it('should reject invalid token', () => {
      const decoded = verifyToken('invalid.token.here');
      expect(decoded).toBeNull();
    });
  });

  describe('User Registration', () => {
    it('should register a new user', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);

      // Mock: BEGIN transaction
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      // Mock: user doesn't exist (check query)
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      // Mock: user created (INSERT query)
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          level: 'A1',
          email_verified: false,
          created_at: new Date(),
          updated_at: new Date(),
        }],
      });

      // Mock: session created (INSERT query)
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      // Mock: COMMIT transaction
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await registerUser({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
        level: 'A1',
      });

      expect(result).toBeDefined();
      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBeDefined();
      expect(mockClient.query).toHaveBeenCalledTimes(5); // BEGIN, check, insert user, insert session, COMMIT
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reject duplicate email', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);

      // Mock: BEGIN transaction
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      // Mock: user already exists (check query)
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'existing-user' }],
      });

      // Mock: ROLLBACK (on error)
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        registerUser({
          email: 'existing@example.com',
          name: 'Test User',
          password: 'password123',
        })
      ).rejects.toThrow('User with this email already exists');

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('User Login', () => {
    it('should login with correct credentials', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);

      const passwordHash = await hashPassword('password123');

      // Mock: user found
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          level: 'A1',
          password_hash: passwordHash,
          email_verified: true,
          created_at: new Date(),
          updated_at: new Date(),
        }],
      });

      // Mock: session created
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      // Mock: last login updated
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await loginUser({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toBeDefined();
      expect(result.user.id).toBe('user-123');
      expect(result.token).toBeDefined();
    });

    it('should reject incorrect password', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);

      const passwordHash = await hashPassword('correctpassword');

      // Mock: user found
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          level: 'A1',
          password_hash: passwordHash,
          email_verified: true,
          created_at: new Date(),
          updated_at: new Date(),
        }],
      });

      await expect(
        loginUser({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid email or password');
    });
  });
});

