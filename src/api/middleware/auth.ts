import { Request, Response, NextFunction } from 'express';
import { config } from '../../config/index.js';

export function pinAuth(req: Request, res: Response, next: NextFunction): void {
  if (!config.pin) {
    // No PIN configured, allow all requests
    next();
    return;
  }

  const providedPin = req.headers['x-pin'] || req.query.pin;

  if (providedPin !== config.pin) {
    res.status(401).json({ error: 'Invalid or missing PIN' });
    return;
  }

  next();
}
