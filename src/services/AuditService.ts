import { v4 as uuidv4 } from 'uuid';
import { desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { auditLogs, type AuditLog } from '../db/schema.js';

export type AuditAction =
  | 'device_connect'
  | 'device_disconnect'
  | 'app_block'
  | 'app_unblock'
  | 'app_kill'
  | 'schedule_create'
  | 'schedule_update'
  | 'schedule_delete'
  | 'remote_key'
  | 'power_on'
  | 'power_off'
  | 'brightness_change';

export class AuditService {
  async log(action: AuditAction, target?: string, details?: Record<string, unknown>): Promise<void> {
    const entry: AuditLog = {
      id: uuidv4(),
      action,
      target: target ?? null,
      details: details ? JSON.stringify(details) : null,
      timestamp: new Date(),
    };

    db.insert(auditLogs).values(entry).run();
  }

  async getRecentLogs(limit = 100): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp)).limit(limit).all();
  }
}

export const auditService = new AuditService();
