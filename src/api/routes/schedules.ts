import { Router } from 'express';
import { screenTimeService } from '../../services/ScreenTimeService.js';
import { auditService } from '../../services/AuditService.js';
import { validateBody, validateParams, scheduleSchema } from '../middleware/validation.js';
import { z } from 'zod';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const schedules = await screenTimeService.getSchedules();
    res.json({ schedules });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get schedules' });
  }
});

router.get('/bedtime/status', async (_req, res) => {
  try {
    const isInBedtime = screenTimeService.isInBedtime();
    res.json({ isInBedtime });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check bedtime status' });
  }
});

router.get('/:id', validateParams(z.object({ id: z.string().uuid() })), async (req, res) => {
  try {
    const id = req.params.id as string;
    const schedule = await screenTimeService.getSchedule(id);

    if (!schedule) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }

    res.json({ schedule });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get schedule' });
  }
});

router.post('/', validateBody(scheduleSchema), async (req, res) => {
  try {
    const data = req.body;

    // Convert daysOfWeek array to JSON string if provided
    const scheduleData = {
      ...data,
      daysOfWeek: data.daysOfWeek ? JSON.stringify(data.daysOfWeek) : undefined,
    };

    const schedule = await screenTimeService.createSchedule(scheduleData);
    await auditService.log('schedule_create', schedule.id, { name: schedule.name });

    res.status(201).json({ success: true, schedule });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Create failed';
    res.status(500).json({ error: message });
  }
});

router.put(
  '/:id',
  validateParams(z.object({ id: z.string().uuid() })),
  validateBody(scheduleSchema.partial()),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const data = req.body;

      // Convert daysOfWeek array to JSON string if provided
      const updateData = {
        ...data,
        daysOfWeek: data.daysOfWeek ? JSON.stringify(data.daysOfWeek) : undefined,
      };

      const schedule = await screenTimeService.updateSchedule(id, updateData);

      if (!schedule) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      await auditService.log('schedule_update', schedule.id, { name: schedule.name });

      res.json({ success: true, schedule });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update failed';
      res.status(500).json({ error: message });
    }
  }
);

router.delete('/:id', validateParams(z.object({ id: z.string().uuid() })), async (req, res) => {
  try {
    const id = req.params.id as string;
    const deleted = await screenTimeService.deleteSchedule(id);

    if (!deleted) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }

    await auditService.log('schedule_delete', id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

export default router;
