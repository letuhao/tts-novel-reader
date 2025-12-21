/**
 * Settings API Routes
 * REST endpoints for managing system and user settings
 */
import express, { type Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getSystemSettingsService, type SettingType, type SettingCategory } from '../services/settings/systemSettingsService.js';
import { getUserSettingsService } from '../services/settings/userSettingsService.js';
import { createChildLogger } from '../utils/logger.js';

const router: Router = express.Router();
const logger = createChildLogger({ component: 'settings-routes' });

// Validation schemas
const SystemSettingUpdateSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.unknown()), z.record(z.unknown())]),
  type: z.enum(['string', 'number', 'boolean', 'json', 'array', 'object']),
  description: z.string().optional(),
  category: z.string().optional(),
  updatedBy: z.string().optional(),
});

const UserSettingUpdateSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.unknown()), z.record(z.unknown())]),
  type: z.enum(['string', 'number', 'boolean', 'json', 'array', 'object']),
});

const UserIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});


// ============================================================================
// System Settings Routes
// ============================================================================

/**
 * GET /api/settings/system
 * Get all system settings
 */
router.get('/system', async (_req: Request, res: Response): Promise<void> => {
  try {
    const settingsService = getSystemSettingsService();
    const settings = await settingsService.getAllSettings();

    res.json({
      success: true,
      data: {
        settings,
        count: settings.length,
      },
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to get system settings');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get system settings',
    });
  }
});

/**
 * GET /api/settings/system/:key
 * Get a specific system setting by key
 */
router.get('/system/:key', async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;

    if (!key || key.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Setting key is required',
      });
      return;
    }

    const settingsService = getSystemSettingsService();
    const setting = await settingsService.getSetting(key);

    if (setting === null) {
      res.status(404).json({
        success: false,
        error: `Setting not found: ${key}`,
      });
      return;
    }

    res.json({
      success: true,
      data: setting,
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to get system setting');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get system setting',
    });
  }
});

/**
 * GET /api/settings/system/category/:category
 * Get system settings by category
 */
router.get('/system/category/:category', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.params;

    if (!category || category.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Category is required',
      });
      return;
    }

    const settingsService = getSystemSettingsService();
    const settings = await settingsService.getSettingsByCategory(category);

    res.json({
      success: true,
      data: {
        settings,
        category,
        count: settings.length,
      },
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to get settings by category');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get settings by category',
    });
  }
});

/**
 * PUT /api/settings/system/:key
 * Update a system setting
 */
router.put('/system/:key', async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;

    if (!key || key.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Setting key is required',
      });
      return;
    }

    // Validate request body
    const validationResult = SystemSettingUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors,
      });
      return;
    }

    const { value, type, description, category, updatedBy } = validationResult.data;

    const settingsService = getSystemSettingsService();
    const setting = await settingsService.setSetting(
      key,
      value,
      type as SettingType,
      description ?? undefined,
      (category ?? undefined) as SettingCategory | undefined,
      updatedBy ?? undefined
    );

    logger.info({ key, type, category }, 'System setting updated');

    res.json({
      success: true,
      data: setting,
      message: 'Setting updated successfully',
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to update system setting');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update system setting',
    });
  }
});

/**
 * DELETE /api/settings/system/:key
 * Delete a system setting
 */
router.delete('/system/:key', async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;

    if (!key || key.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Setting key is required',
      });
      return;
    }

    const settingsService = getSystemSettingsService();
    const deleted = await settingsService.deleteSetting(key);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: `Setting not found: ${key}`,
      });
      return;
    }

    logger.info({ key }, 'System setting deleted');

    res.json({
      success: true,
      message: 'Setting deleted successfully',
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to delete system setting');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete system setting',
    });
  }
});

// ============================================================================
// User Settings Routes
// ============================================================================

/**
 * GET /api/settings/user/:userId
 * Get all settings for a user
 */
router.get('/user/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // Validate UUID format and ensure userId is defined
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const userIdValidation = UserIdParamSchema.safeParse({ userId });
    if (!userIdValidation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
        details: userIdValidation.error.errors,
      });
      return;
    }

    const userSettingsService = getUserSettingsService();
    const settings = await userSettingsService.getUserSettings(userId);

    res.json({
      success: true,
      data: {
        settings,
        userId,
        count: settings.length,
      },
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to get user settings');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user settings',
    });
  }
});

/**
 * GET /api/settings/user/:userId/:key
 * Get a specific user setting
 */
router.get('/user/:userId/:key', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, key } = req.params;

    // Validate UUID format and ensure userId is defined
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const userIdValidation = UserIdParamSchema.safeParse({ userId });
    if (!userIdValidation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
        details: userIdValidation.error.errors,
      });
      return;
    }

    if (!key || key.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Setting key is required',
      });
      return;
    }

    const userSettingsService = getUserSettingsService();
    const setting = await userSettingsService.getUserSetting(userId, key);

    if (setting === null) {
      res.status(404).json({
        success: false,
        error: `User setting not found: ${key}`,
      });
      return;
    }

    res.json({
      success: true,
      data: setting,
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to get user setting');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user setting',
    });
  }
});

/**
 * PUT /api/settings/user/:userId/:key
 * Update a user setting
 */
router.put('/user/:userId/:key', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, key } = req.params;

    // Validate UUID format and ensure userId is defined
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const userIdValidation = UserIdParamSchema.safeParse({ userId });
    if (!userIdValidation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
        details: userIdValidation.error.errors,
      });
      return;
    }

    if (!key || key.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Setting key is required',
      });
      return;
    }

    // Validate request body
    const validationResult = UserSettingUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors,
      });
      return;
    }

    const { value, type } = validationResult.data;

    const userSettingsService = getUserSettingsService();
    const setting = await userSettingsService.setUserSetting(userId, key, value, type as SettingType);

    logger.info({ userId, key, type }, 'User setting updated');

    res.json({
      success: true,
      data: setting,
      message: 'Setting updated successfully',
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to update user setting');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user setting',
    });
  }
});

/**
 * DELETE /api/settings/user/:userId/:key
 * Delete a user setting
 */
router.delete('/user/:userId/:key', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, key } = req.params;

    // Validate UUID format and ensure userId is defined
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const userIdValidation = UserIdParamSchema.safeParse({ userId });
    if (!userIdValidation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
        details: userIdValidation.error.errors,
      });
      return;
    }

    if (!key || key.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Setting key is required',
      });
      return;
    }

    const userSettingsService = getUserSettingsService();
    const deleted = await userSettingsService.deleteUserSetting(userId, key);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: `User setting not found: ${key}`,
      });
      return;
    }

    logger.info({ userId, key }, 'User setting deleted');

    res.json({
      success: true,
      message: 'Setting deleted successfully',
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to delete user setting');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user setting',
    });
  }
});

export default router;

