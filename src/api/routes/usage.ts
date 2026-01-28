import { Router } from 'express';
import { usageMonitorService } from '../../services/UsageMonitorService.js';
import { validateQuery, dateQuerySchema } from '../middleware/validation.js';

const router = Router();

router.get('/current', async (_req, res) => {
  try {
    const currentApp = usageMonitorService.getCurrentApp();
    res.json({ currentApp });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get current app' });
  }
});

router.get('/dashboard', validateQuery(dateQuerySchema), async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query as {
      date?: string;
      startDate?: string;
      endDate?: string;
    };

    if (startDate && endDate) {
      const summaries = await usageMonitorService.getUsageRange(startDate, endDate);
      res.json({ summaries });
    } else {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const summary = await usageMonitorService.getUsageSummary(targetDate);
      res.json({ summary });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to get usage data' });
  }
});

router.get('/today', async (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const summary = await usageMonitorService.getUsageSummary(today);

    // Format durations for readability
    const formatDuration = (ms: number) => {
      const minutes = Math.floor(ms / 60000);
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;

      if (hours > 0) {
        return `${hours}h ${remainingMinutes}m`;
      }
      return `${minutes}m`;
    };

    res.json({
      date: today,
      totalTime: formatDuration(summary.totalDurationMs),
      totalDurationMs: summary.totalDurationMs,
      apps: summary.appUsage.map((app) => ({
        ...app,
        duration: formatDuration(app.durationMs),
      })),
      currentApp: usageMonitorService.getCurrentApp(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get today\'s usage' });
  }
});

router.get('/history', validateQuery(dateQuerySchema), async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    // Default to last 7 days
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    })();

    const summaries = await usageMonitorService.getUsageRange(start, end);

    // Calculate totals
    const totalMs = summaries.reduce((sum, s) => sum + s.totalDurationMs, 0);
    const avgMs = summaries.length > 0 ? totalMs / summaries.length : 0;

    res.json({
      startDate: start,
      endDate: end,
      days: summaries,
      totalDurationMs: totalMs,
      averageDurationMs: avgMs,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get usage history' });
  }
});

export default router;
