/**
 * Authentication Routes
 * Handles user registration, login, logout, and session management
 */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { registerUser, loginUser, logoutUser, getUserById } from '../services/auth/authService.js';
import { authenticate, optionalAuthenticate } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Validation schemas
const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().max(255, 'Name too long').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const validationResult = RegisterSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    const authResponse = await registerUser({
      email: validationResult.data.email,
      ...(validationResult.data.name && { name: validationResult.data.name }),
      password: validationResult.data.password,
      ...(validationResult.data.level && { level: validationResult.data.level }),
    });

    res.status(201).json({
      success: true,
      data: authResponse,
    });
  } catch (error) {
    logger.error({ err: error }, 'Registration failed');

    if (error instanceof Error && error.message === 'User with this email already exists') {
      res.status(409).json({
        success: false,
        error: error.message,
        code: 'USER_EXISTS',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR',
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const validationResult = LoginSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    const ipAddress = req.ip || req.socket.remoteAddress || undefined;
    const userAgent = req.headers['user-agent'] || undefined;

    const authResponse = await loginUser(validationResult.data, ipAddress, userAgent);

    // Set token in cookie (optional)
    res.cookie('token', authResponse.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      data: authResponse,
    });
  } catch (error) {
    logger.error({ err: error }, 'Login failed');

    if (error instanceof Error && error.message.includes('Invalid')) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Login failed',
      code: 'LOGIN_ERROR',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (invalidate session)
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : (req.cookies?.token as string | undefined);

    if (token) {
      await logoutUser(token);
    }

    // Clear cookie
    res.clearCookie('token');

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error({ err: error }, 'Logout failed');
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      code: 'LOGOUT_ERROR',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    res.json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    logger.error({ err: error }, 'Get current user failed');
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      code: 'GET_USER_ERROR',
    });
  }
});

/**
 * GET /api/auth/verify
 * Verify token and get user
 */
router.get('/verify', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'AUTH_INVALID',
      });
      return;
    }

    res.json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    logger.error({ err: error }, 'Token verification failed');
    res.status(500).json({
      success: false,
      error: 'Token verification failed',
      code: 'VERIFY_ERROR',
    });
  }
});

/**
 * GET /api/auth/user/:id
 * Get user by ID (admin or self)
 */
router.get('/user/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'User ID required',
        code: 'USER_ID_REQUIRED',
      });
      return;
    }

    // Only allow users to get their own data (or admin in future)
    if (req.userId !== id) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
      });
      return;
    }

    const user = await getUserById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error({ err: error }, 'Get user failed');
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      code: 'GET_USER_ERROR',
    });
  }
});

export default router;

