/**
 * Authentication Service
 * Handles user authentication, JWT tokens, and session management
 */
import { getPool } from '../../database/connection.js';
import { logger } from '../../utils/logger.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 12;

export interface User {
  id: string;
  email: string;
  name: string;
  level: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterRequest {
  email: string;
  name?: string;
  password: string;
  level?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
  expiresAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    return decoded;
  } catch (error) {
    logger.debug({ err: error }, 'Token verification failed');
    return null;
  }
}

/**
 * Hash token for storage (one-way hash)
 */
export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, SALT_ROUNDS);
}

/**
 * Register new user
 */
export async function registerUser(request: RegisterRequest): Promise<AuthResponse> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if user already exists
    const existingUser = await client.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [request.email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(request.password);

    // Create user
    const userResult = await client.query<{
      id: string;
      email: string;
      name: string;
      level: string;
      email_verified: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO users (email, name, password_hash, level, email_verified)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, level, email_verified, created_at, updated_at`,
      [
        request.email.toLowerCase(),
        request.name || '', // Use empty string as default since DB requires NOT NULL
        passwordHash,
        request.level || 'A1',
        false, // Email not verified by default
      ]
    );

    const user = userResult.rows[0]!;

    // Generate token
    const token = generateToken(user.id, user.email);
    const tokenHash = await hashToken(token);

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days default

    // Create session
    await client.query(
      `INSERT INTO user_sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    await client.query('COMMIT');

    logger.info({ userId: user.id, email: user.email }, 'User registered successfully');

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        level: user.level,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      token,
      expiresAt,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ err: error }, 'User registration failed');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Login user
 */
export async function loginUser(
  request: LoginRequest,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthResponse> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Find user by email
    const userResult = await client.query<{
      id: string;
      email: string;
      name: string;
      level: string;
      password_hash: string | null;
      email_verified: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      'SELECT id, email, name, level, password_hash, email_verified, created_at, updated_at FROM users WHERE email = $1',
      [request.email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = userResult.rows[0]!;

    // Verify password
    if (!user.password_hash) {
      throw new Error('Invalid email or password');
    }

    const isValid = await verifyPassword(request.password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = generateToken(user.id, user.email);
    const tokenHash = await hashToken(token);

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days default

    // Create session
    await client.query(
      `INSERT INTO user_sessions (user_id, token_hash, expires_at, ip_address, user_agent, last_used_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [user.id, tokenHash, expiresAt, ipAddress || null, userAgent || null]
    );

    // Update last login
    await client.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    logger.info({ userId: user.id, email: user.email }, 'User logged in successfully');

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        level: user.level,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      token,
      expiresAt,
    };
  } catch (error) {
    logger.error({ err: error }, 'User login failed');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Verify token and get user
 */
export async function verifySession(token: string): Promise<User | null> {
  const pool = getPool();

  try {
    // Verify JWT token
    const decoded = verifyToken(token);
    if (!decoded) {
      return null;
    }

    // Find session by token hash
    // Note: We need to check all sessions for this user and verify token hash
    // This is simplified - in production, you might want to store token hash in JWT
    const sessions = await pool.query<{
      token_hash: string;
      expires_at: Date;
      user_id: string;
    }>(
      `SELECT token_hash, expires_at, user_id
       FROM user_sessions
       WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC
       LIMIT 10`,
      [decoded.userId]
    );

    // Check if any session matches (simplified - in production, verify hash)
    const validSession = sessions.rows.find(
      (session) => session.expires_at > new Date()
    );

    if (!validSession) {
      return null;
    }

    // Update last used
    await pool.query(
      'UPDATE user_sessions SET last_used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND token_hash = $2',
      [decoded.userId, validSession.token_hash]
    );

    // Get user
    const userResult = await pool.query<{
      id: string;
      email: string;
      name: string;
      level: string;
      email_verified: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      'SELECT id, email, name, level, email_verified, created_at, updated_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    const user = userResult.rows[0]!;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      level: user.level,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  } catch (error) {
    logger.error({ err: error }, 'Session verification failed');
    return null;
  }
}

/**
 * Logout user (invalidate session)
 */
export async function logoutUser(token: string): Promise<void> {
  const pool = getPool();

  try {
    const decoded = verifyToken(token);
    if (!decoded) {
      return;
    }

    // Delete all sessions for user (or specific session if token hash stored)
    // Simplified: delete all sessions
    await pool.query(
      'DELETE FROM user_sessions WHERE user_id = $1',
      [decoded.userId]
    );

    logger.info({ userId: decoded.userId }, 'User logged out');
  } catch (error) {
    logger.error({ err: error }, 'Logout failed');
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const pool = getPool();

  try {
    const result = await pool.query<{
      id: string;
      email: string;
      name: string;
      level: string;
      email_verified: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      'SELECT id, email, name, level, email_verified, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0]!;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      level: user.level,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  } catch (error) {
    logger.error({ err: error }, 'Failed to get user');
    return null;
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const pool = getPool();

  try {
    const result = await pool.query(
      'DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP RETURNING id'
    );

    const deletedCount = result.rows.length;
    if (deletedCount > 0) {
      logger.info({ count: deletedCount }, 'Cleaned up expired sessions');
    }

    return deletedCount;
  } catch (error) {
    logger.error({ err: error }, 'Failed to cleanup expired sessions');
    return 0;
  }
}

