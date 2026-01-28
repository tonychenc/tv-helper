import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const apps = sqliteTable('apps', {
  packageName: text('package_name').primaryKey(),
  appName: text('app_name'),
  isSystem: integer('is_system', { mode: 'boolean' }).default(false),
  firstSeen: integer('first_seen', { mode: 'timestamp' }).notNull(),
  lastSeen: integer('last_seen', { mode: 'timestamp' }).notNull(),
});

export const blockRules = sqliteTable('block_rules', {
  id: text('id').primaryKey(),
  packageName: text('package_name').notNull().references(() => apps.packageName),
  type: text('type', { enum: ['block', 'whitelist'] }).notNull(),
  reason: text('reason'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const schedules = sqliteTable('schedules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['bedtime', 'daily_limit', 'app_schedule'] }).notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  startTime: text('start_time'), // HH:MM format
  endTime: text('end_time'), // HH:MM format
  dailyLimitMinutes: integer('daily_limit_minutes'),
  daysOfWeek: text('days_of_week'), // JSON array of 0-6 (Sun-Sat)
  packageName: text('package_name').references(() => apps.packageName),
  action: text('action', { enum: ['block', 'warn', 'power_off'] }).default('block'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const usageLogs = sqliteTable('usage_logs', {
  id: text('id').primaryKey(),
  packageName: text('package_name').notNull(),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp' }),
  durationMs: integer('duration_ms'),
  date: text('date').notNull(), // YYYY-MM-DD format
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  target: text('target'),
  details: text('details'), // JSON
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});

export type App = typeof apps.$inferSelect;
export type NewApp = typeof apps.$inferInsert;
export type BlockRule = typeof blockRules.$inferSelect;
export type NewBlockRule = typeof blockRules.$inferInsert;
export type Schedule = typeof schedules.$inferSelect;
export type NewSchedule = typeof schedules.$inferInsert;
export type UsageLog = typeof usageLogs.$inferSelect;
export type NewUsageLog = typeof usageLogs.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
