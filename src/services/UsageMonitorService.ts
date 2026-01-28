import { v4 as uuidv4 } from 'uuid';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { usageLogs, type UsageLog } from '../db/schema.js';
import { adbManager } from '../adb/AdbManager.js';
import { config } from '../config/index.js';
import { EventEmitter } from 'events';

export interface UsageSummary {
  date: string;
  totalDurationMs: number;
  appUsage: { packageName: string; durationMs: number }[];
}

export class UsageMonitorService extends EventEmitter {
  private pollingInterval: NodeJS.Timeout | null = null;
  private currentSession: { id: string; packageName: string; startTime: Date } | null = null;
  private lastScreenState: boolean | null = null;

  start(): void {
    if (this.pollingInterval) {
      return;
    }

    this.pollingInterval = setInterval(() => {
      this.pollCurrentApp();
    }, config.usagePollingInterval);

    // Initial poll
    this.pollCurrentApp();
  }

  stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Close current session if any
    this.closeCurrentSession();
    this.lastScreenState = null;
  }

  private async pollCurrentApp(): Promise<void> {
    if (!adbManager.isConnected()) {
      return;
    }

    try {
      // Check screen state and emit event if changed
      const isScreenOn = await adbManager.power.isScreenOn();
      if (this.lastScreenState !== null && isScreenOn !== this.lastScreenState) {
        this.emit('screenStateChanged', { isScreenOn });
      }
      this.lastScreenState = isScreenOn;

      const activity = await adbManager.stats.getCurrentActivity();

      if (!activity) {
        this.closeCurrentSession();
        return;
      }

      const { packageName } = activity;

      // Same app still running
      if (this.currentSession?.packageName === packageName) {
        return;
      }

      // Close previous session
      this.closeCurrentSession();

      // Start new session
      const now = new Date();
      const session = {
        id: uuidv4(),
        packageName,
        startTime: now,
      };

      this.currentSession = session;

      this.emit('appChanged', { packageName, startTime: now });
    } catch (error) {
      // Silently handle polling errors
      console.error('Usage polling error:', error);
    }
  }

  private closeCurrentSession(): void {
    if (!this.currentSession) {
      return;
    }

    const now = new Date();
    const durationMs = now.getTime() - this.currentSession.startTime.getTime();
    const date = this.currentSession.startTime.toISOString().split('T')[0];

    const log: UsageLog = {
      id: this.currentSession.id,
      packageName: this.currentSession.packageName,
      startTime: this.currentSession.startTime,
      endTime: now,
      durationMs,
      date,
    };

    db.insert(usageLogs).values(log).run();

    this.emit('sessionEnded', log);
    this.currentSession = null;
  }

  getCurrentApp(): { packageName: string; startTime: Date } | null {
    return this.currentSession
      ? { packageName: this.currentSession.packageName, startTime: this.currentSession.startTime }
      : null;
  }

  async getUsageForDate(date: string): Promise<UsageLog[]> {
    return db.select().from(usageLogs).where(eq(usageLogs.date, date)).all();
  }

  async getUsageSummary(date: string): Promise<UsageSummary> {
    const logs = await this.getUsageForDate(date);

    const appUsageMap = new Map<string, number>();
    let totalDurationMs = 0;

    for (const log of logs) {
      const duration = log.durationMs || 0;
      totalDurationMs += duration;

      const current = appUsageMap.get(log.packageName) || 0;
      appUsageMap.set(log.packageName, current + duration);
    }

    // Add current session if it's today
    if (this.currentSession) {
      const sessionDate = this.currentSession.startTime.toISOString().split('T')[0];
      if (sessionDate === date) {
        const currentDuration = Date.now() - this.currentSession.startTime.getTime();
        totalDurationMs += currentDuration;

        const current = appUsageMap.get(this.currentSession.packageName) || 0;
        appUsageMap.set(this.currentSession.packageName, current + currentDuration);
      }
    }

    const appUsage = Array.from(appUsageMap.entries())
      .map(([packageName, durationMs]) => ({ packageName, durationMs }))
      .sort((a, b) => b.durationMs - a.durationMs);

    return { date, totalDurationMs, appUsage };
  }

  async getUsageRange(startDate: string, endDate: string): Promise<UsageSummary[]> {
    const logs = db
      .select()
      .from(usageLogs)
      .where(and(gte(usageLogs.date, startDate), lte(usageLogs.date, endDate)))
      .all();

    const dateMap = new Map<string, UsageLog[]>();

    for (const log of logs) {
      const existing = dateMap.get(log.date) || [];
      existing.push(log);
      dateMap.set(log.date, existing);
    }

    const summaries: UsageSummary[] = [];

    for (const [date, dateLogs] of dateMap) {
      const appUsageMap = new Map<string, number>();
      let totalDurationMs = 0;

      for (const log of dateLogs) {
        const duration = log.durationMs || 0;
        totalDurationMs += duration;

        const current = appUsageMap.get(log.packageName) || 0;
        appUsageMap.set(log.packageName, current + duration);
      }

      const appUsage = Array.from(appUsageMap.entries())
        .map(([packageName, durationMs]) => ({ packageName, durationMs }))
        .sort((a, b) => b.durationMs - a.durationMs);

      summaries.push({ date, totalDurationMs, appUsage });
    }

    return summaries.sort((a, b) => a.date.localeCompare(b.date));
  }

  async getTodayUsageForApp(packageName: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const logs = db
      .select()
      .from(usageLogs)
      .where(and(eq(usageLogs.date, today), eq(usageLogs.packageName, packageName)))
      .all();

    let totalMs = logs.reduce((sum, log) => sum + (log.durationMs || 0), 0);

    // Add current session if it matches
    if (this.currentSession?.packageName === packageName) {
      const sessionDate = this.currentSession.startTime.toISOString().split('T')[0];
      if (sessionDate === today) {
        totalMs += Date.now() - this.currentSession.startTime.getTime();
      }
    }

    return totalMs;
  }
}

export const usageMonitorService = new UsageMonitorService();
