import { z } from 'zod';

const configSchema = z.object({
  port: z.number().default(3000),
  host: z.string().default('127.0.0.1'),
  dbPath: z.string().default('./data/tv-helper.db'),
  adb: z.object({
    defaultPort: z.number().default(5555),
    connectionTimeout: z.number().default(10000),
    commandTimeout: z.number().default(30000),
    healthCheckInterval: z.number().default(30000),
    maxRetries: z.number().default(3),
  }),
  usagePollingInterval: z.number().default(10000),
  pin: z.string().optional(),
  bedtime: z.object({
    enforcementInterval: z.number().default(3000),
  }),
});

export type Config = z.infer<typeof configSchema>;

export const config: Config = configSchema.parse({
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '127.0.0.1',
  dbPath: process.env.DB_PATH || './data/tv-helper.db',
  adb: {
    defaultPort: parseInt(process.env.ADB_PORT || '5555', 10),
    connectionTimeout: parseInt(process.env.ADB_CONNECTION_TIMEOUT || '10000', 10),
    commandTimeout: parseInt(process.env.ADB_COMMAND_TIMEOUT || '30000', 10),
    healthCheckInterval: parseInt(process.env.ADB_HEALTH_CHECK_INTERVAL || '30000', 10),
    maxRetries: parseInt(process.env.ADB_MAX_RETRIES || '3', 10),
  },
  usagePollingInterval: parseInt(process.env.USAGE_POLLING_INTERVAL || '10000', 10),
  pin: process.env.PIN,
  bedtime: {
    enforcementInterval: parseInt(process.env.BEDTIME_ENFORCEMENT_INTERVAL || '3000', 10),
  },
});
