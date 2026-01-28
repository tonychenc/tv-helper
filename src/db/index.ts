import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { config } from '../config/index.js';
import * as schema from './schema.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

// Ensure data directory exists
mkdirSync(dirname(config.dbPath), { recursive: true });

const sqlite: DatabaseType = new Database(config.dbPath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

// Initialize database tables
export function initializeDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS apps (
      package_name TEXT PRIMARY KEY,
      app_name TEXT,
      is_system INTEGER DEFAULT 0,
      first_seen INTEGER NOT NULL,
      last_seen INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS block_rules (
      id TEXT PRIMARY KEY,
      package_name TEXT NOT NULL REFERENCES apps(package_name),
      type TEXT NOT NULL CHECK (type IN ('block', 'whitelist')),
      reason TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('bedtime', 'daily_limit', 'app_schedule')),
      enabled INTEGER DEFAULT 1,
      start_time TEXT,
      end_time TEXT,
      daily_limit_minutes INTEGER,
      days_of_week TEXT,
      package_name TEXT REFERENCES apps(package_name),
      action TEXT DEFAULT 'block' CHECK (action IN ('block', 'warn', 'power_off')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usage_logs (
      id TEXT PRIMARY KEY,
      package_name TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration_ms INTEGER,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      target TEXT,
      details TEXT,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_usage_logs_date ON usage_logs(date);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_package ON usage_logs(package_name);
    CREATE INDEX IF NOT EXISTS idx_block_rules_package ON block_rules(package_name);
    CREATE INDEX IF NOT EXISTS idx_schedules_enabled ON schedules(enabled);
  `);
}

export { sqlite };
