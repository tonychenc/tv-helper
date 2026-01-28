import { Router } from 'express';
import deviceRoutes from './device.js';
import appsRoutes from './apps.js';
import schedulesRoutes from './schedules.js';
import usageRoutes from './usage.js';
import remoteRoutes from './remote.js';
import { auditService } from '../../services/AuditService.js';

const router = Router();

// Mount routes
router.use('/device', deviceRoutes);
router.use('/apps', appsRoutes);
router.use('/schedules', schedulesRoutes);
router.use('/usage', usageRoutes);
router.use('/remote', remoteRoutes);

// Audit log endpoint
router.get('/audit', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const logs = await auditService.getRecentLogs(Math.min(limit, 500));
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
