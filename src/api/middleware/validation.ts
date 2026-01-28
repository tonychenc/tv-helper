import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.issues,
      });
      return;
    }

    req.body = result.data;
    next();
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.issues,
      });
      return;
    }

    req.params = result.data as typeof req.params;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.issues,
      });
      return;
    }

    // Don't reassign req.query - it's read-only in Express 5
    // Validation passed, the original req.query values are valid
    next();
  };
}

// Common validation schemas
export const packageNameSchema = z.object({
  pkg: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_.]*$/, 'Invalid package name'),
});

export const connectSchema = z.object({
  host: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, 'Invalid IP address'),
  port: z.number().int().min(1).max(65535).optional(),
});

export const keyEventSchema = z.object({
  key: z.enum([
    'up', 'down', 'left', 'right', 'select', 'back', 'home', 'menu',
    'play_pause', 'volume_up', 'volume_down', 'mute', 'power',
    'channel_up', 'channel_down',
  ]),
});

export const keyCodeSchema = z.object({
  keyCode: z.number().int().min(0).max(1000),
});

export const textInputSchema = z.object({
  text: z.string().max(500),
});

export const brightnessSchema = z.object({
  level: z.number().int().min(0).max(255),
});

export const scheduleSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['bedtime', 'daily_limit', 'app_schedule']),
  enabled: z.boolean().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  dailyLimitMinutes: z.number().int().min(1).max(1440).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  packageName: z.string().optional(),
  action: z.enum(['block', 'warn', 'power_off']).optional(),
});

export const dateQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
