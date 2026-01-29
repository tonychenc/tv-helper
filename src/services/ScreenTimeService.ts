import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import * as cron from 'node-cron';
import { db } from '../db/index.js';
import { schedules, type Schedule, type NewSchedule } from '../db/schema.js';
import { adbManager } from '../adb/AdbManager.js';
import { appBlockingService } from './AppBlockingService.js';
import { usageMonitorService } from './UsageMonitorService.js';
import { EventEmitter } from 'events';

export class ScreenTimeService extends EventEmitter {
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private limitCheckInterval: NodeJS.Timeout | null = null;

  start(): void {
    this.loadSchedules();
    this.startLimitChecker();
  }

  stop(): void {
    for (const job of this.cronJobs.values()) {
      job.stop();
    }
    this.cronJobs.clear();

    if (this.limitCheckInterval) {
      clearInterval(this.limitCheckInterval);
      this.limitCheckInterval = null;
    }
  }

  private async loadSchedules(): Promise<void> {
    const allSchedules = db.select().from(schedules).where(eq(schedules.enabled, true)).all();

    for (const schedule of allSchedules) {
      this.setupScheduleCron(schedule);
    }
  }

  private setupScheduleCron(schedule: Schedule): void {
    // Remove existing job if any
    const existingJob = this.cronJobs.get(schedule.id);
    if (existingJob) {
      existingJob.stop();
      this.cronJobs.delete(schedule.id);
    }

    if (!schedule.enabled) {
      return;
    }

    if (schedule.type === 'bedtime' && schedule.startTime && schedule.endTime) {
      // Schedule for bedtime start
      const [startHour, startMinute] = schedule.startTime.split(':');
      const daysOfWeek = schedule.daysOfWeek ? JSON.parse(schedule.daysOfWeek) : [0, 1, 2, 3, 4, 5, 6];
      const daysExpr = daysOfWeek.join(',');

      const startCron = `${startMinute} ${startHour} * * ${daysExpr}`;
      const startJob = cron.schedule(startCron, () => {
        this.executeBedtimeStart(schedule);
      });

      this.cronJobs.set(`${schedule.id}-start`, startJob);

      // Schedule for bedtime end
      const [endHour, endMinute] = schedule.endTime.split(':');
      const endCron = `${endMinute} ${endHour} * * ${daysExpr}`;
      const endJob = cron.schedule(endCron, () => {
        this.executeBedtimeEnd(schedule);
      });

      this.cronJobs.set(`${schedule.id}-end`, endJob);
    }

    if (schedule.type === 'app_schedule' && schedule.packageName && schedule.startTime) {
      const [hour, minute] = schedule.startTime.split(':');
      const daysOfWeek = schedule.daysOfWeek ? JSON.parse(schedule.daysOfWeek) : [0, 1, 2, 3, 4, 5, 6];
      const daysExpr = daysOfWeek.join(',');

      const cronExpr = `${minute} ${hour} * * ${daysExpr}`;
      const job = cron.schedule(cronExpr, () => {
        this.executeAppSchedule(schedule);
      });

      this.cronJobs.set(schedule.id, job);
    }
  }

  private async executeBedtimeStart(schedule: Schedule): Promise<void> {
    if (!adbManager.isConnected()) {
      return;
    }

    this.emit('bedtimeStarted', schedule);

    // Bedtime always turns off the TV - that's the point of bedtime
    await adbManager.power.screenOff();
  }

  private async executeBedtimeEnd(schedule: Schedule): Promise<void> {
    this.emit('bedtimeEnded', schedule);
  }

  private async executeAppSchedule(schedule: Schedule): Promise<void> {
    if (!schedule.packageName) {
      return;
    }

    this.emit('appScheduleTriggered', schedule);

    if (schedule.action === 'block') {
      await appBlockingService.blockApp(schedule.packageName, `Scheduled block: ${schedule.name}`);
    }
  }

  private startLimitChecker(): void {
    // Check limits every minute
    this.limitCheckInterval = setInterval(() => {
      this.checkDailyLimits();
    }, 60000);

    // Initial check
    this.checkDailyLimits();
  }

  private async checkDailyLimits(): Promise<void> {
    const limitSchedules = db
      .select()
      .from(schedules)
      .where(and(eq(schedules.enabled, true), eq(schedules.type, 'daily_limit')))
      .all();

    for (const schedule of limitSchedules) {
      if (!schedule.packageName || !schedule.dailyLimitMinutes) {
        continue;
      }

      const usageMs = await usageMonitorService.getTodayUsageForApp(schedule.packageName);
      const limitMs = schedule.dailyLimitMinutes * 60 * 1000;

      if (usageMs >= limitMs) {
        this.emit('limitReached', {
          schedule,
          usageMs,
          limitMs,
        });

        if (schedule.action === 'block') {
          const isBlocked = await appBlockingService.isAppBlocked(schedule.packageName);
          if (!isBlocked) {
            await appBlockingService.blockApp(
              schedule.packageName,
              `Daily limit reached: ${schedule.dailyLimitMinutes} minutes`
            );
          }
        }
      }
    }
  }

  async createSchedule(data: Omit<NewSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<Schedule> {
    const now = new Date();
    const schedule: Schedule = {
      id: uuidv4(),
      name: data.name,
      type: data.type,
      enabled: data.enabled ?? true,
      startTime: data.startTime ?? null,
      endTime: data.endTime ?? null,
      dailyLimitMinutes: data.dailyLimitMinutes ?? null,
      daysOfWeek: data.daysOfWeek ?? null,
      packageName: data.packageName ?? null,
      action: data.action ?? 'block',
      createdAt: now,
      updatedAt: now,
    };

    db.insert(schedules).values(schedule).run();
    this.setupScheduleCron(schedule);

    return schedule;
  }

  async updateSchedule(
    id: string,
    data: Partial<Omit<Schedule, 'id' | 'createdAt'>>
  ): Promise<Schedule | null> {
    const existing = db.select().from(schedules).where(eq(schedules.id, id)).get();

    if (!existing) {
      return null;
    }

    const updated: Schedule = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };

    db.update(schedules)
      .set({
        name: updated.name,
        type: updated.type,
        enabled: updated.enabled,
        startTime: updated.startTime,
        endTime: updated.endTime,
        dailyLimitMinutes: updated.dailyLimitMinutes,
        daysOfWeek: updated.daysOfWeek,
        packageName: updated.packageName,
        action: updated.action,
        updatedAt: updated.updatedAt,
      })
      .where(eq(schedules.id, id))
      .run();

    this.setupScheduleCron(updated);

    return updated;
  }

  async deleteSchedule(id: string): Promise<boolean> {
    const job = this.cronJobs.get(id);
    if (job) {
      job.stop();
      this.cronJobs.delete(id);
    }

    // Also check for bedtime jobs
    const startJob = this.cronJobs.get(`${id}-start`);
    const endJob = this.cronJobs.get(`${id}-end`);
    if (startJob) {
      startJob.stop();
      this.cronJobs.delete(`${id}-start`);
    }
    if (endJob) {
      endJob.stop();
      this.cronJobs.delete(`${id}-end`);
    }

    const result = db.delete(schedules).where(eq(schedules.id, id)).run();
    return result.changes > 0;
  }

  async getSchedules(): Promise<Schedule[]> {
    return db.select().from(schedules).all();
  }

  async getSchedule(id: string): Promise<Schedule | null> {
    return db.select().from(schedules).where(eq(schedules.id, id)).get() ?? null;
  }

  isInBedtime(): boolean {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = now.getDay();

    const bedtimeSchedules = db
      .select()
      .from(schedules)
      .where(and(eq(schedules.enabled, true), eq(schedules.type, 'bedtime')))
      .all();

    for (const schedule of bedtimeSchedules) {
      if (!schedule.startTime || !schedule.endTime) {
        continue;
      }

      const days = schedule.daysOfWeek ? JSON.parse(schedule.daysOfWeek) : [0, 1, 2, 3, 4, 5, 6];
      if (!days.includes(currentDay)) {
        continue;
      }

      // Handle overnight schedules (e.g., 22:00 - 07:00)
      if (schedule.startTime > schedule.endTime) {
        if (currentTime >= schedule.startTime || currentTime < schedule.endTime) {
          return true;
        }
      } else {
        if (currentTime >= schedule.startTime && currentTime < schedule.endTime) {
          return true;
        }
      }
    }

    return false;
  }

  getMinutesUntilBedtime(): number | null {
    const now = new Date();
    const currentDay = now.getDay();

    const bedtimeSchedules = db
      .select()
      .from(schedules)
      .where(and(eq(schedules.enabled, true), eq(schedules.type, 'bedtime')))
      .all();

    let minMinutes: number | null = null;

    for (const schedule of bedtimeSchedules) {
      if (!schedule.startTime) {
        continue;
      }

      const days = schedule.daysOfWeek ? JSON.parse(schedule.daysOfWeek) : [0, 1, 2, 3, 4, 5, 6];
      if (!days.includes(currentDay)) {
        continue;
      }

      const [startHour, startMinute] = schedule.startTime.split(':').map(Number);

      // Create a date for bedtime start today
      const bedtimeStart = new Date(now);
      bedtimeStart.setHours(startHour, startMinute, 0, 0);

      // If bedtime has already passed today, skip
      if (bedtimeStart <= now) {
        continue;
      }

      const diffMs = bedtimeStart.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);

      if (minMinutes === null || diffMinutes < minMinutes) {
        minMinutes = diffMinutes;
      }
    }

    return minMinutes;
  }
}

export const screenTimeService = new ScreenTimeService();
