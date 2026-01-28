import { Router } from 'express';
import { appBlockingService } from '../../services/AppBlockingService.js';
import { auditService } from '../../services/AuditService.js';
import { validateParams, validateBody, packageNameSchema } from '../middleware/validation.js';
import { z } from 'zod';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const apps = await appBlockingService.getApps();
    const blockedApps = await appBlockingService.getBlockedApps();
    const blockedSet = new Set(blockedApps.map((r) => r.packageName));

    const appsWithStatus = apps.map((app) => ({
      ...app,
      isBlocked: blockedSet.has(app.packageName),
    }));

    res.json({ apps: appsWithStatus });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get apps' });
  }
});

router.post('/sync', async (_req, res) => {
  try {
    const apps = await appBlockingService.syncApps();
    res.json({ success: true, count: apps.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    res.status(500).json({ error: message });
  }
});

router.get('/blocked', async (_req, res) => {
  try {
    const rules = await appBlockingService.getBlockedApps();
    res.json({ rules });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get blocked apps' });
  }
});

router.post(
  '/:pkg/block',
  validateParams(packageNameSchema),
  validateBody(z.object({ reason: z.string().optional() })),
  async (req, res) => {
    try {
      const pkg = req.params.pkg as string;
      const { reason } = req.body;

      const rule = await appBlockingService.blockApp(pkg, reason);
      await auditService.log('app_block', pkg, { reason });

      res.json({ success: true, rule });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Block failed';
      res.status(500).json({ error: message });
    }
  }
);

router.delete('/:pkg/block', validateParams(packageNameSchema), async (req, res) => {
  try {
    const pkg = req.params.pkg as string;

    await appBlockingService.unblockApp(pkg);
    await auditService.log('app_unblock', pkg);

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unblock failed';
    res.status(500).json({ error: message });
  }
});

router.post('/:pkg/kill', validateParams(packageNameSchema), async (req, res) => {
  try {
    const pkg = req.params.pkg as string;

    await appBlockingService.forceStopApp(pkg);
    await auditService.log('app_kill', pkg);

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Force stop failed';
    res.status(500).json({ error: message });
  }
});

router.get('/:pkg/status', validateParams(packageNameSchema), async (req, res) => {
  try {
    const pkg = req.params.pkg as string;
    const isBlocked = await appBlockingService.isAppBlocked(pkg);

    res.json({ packageName: pkg, isBlocked });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get app status' });
  }
});

export default router;
