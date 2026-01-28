import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { apps, blockRules, type App, type BlockRule } from '../db/schema.js';
import { adbManager } from '../adb/AdbManager.js';

export class AppBlockingService {
  async syncApps(): Promise<App[]> {
    if (!adbManager.isConnected()) {
      throw new Error('Device not connected');
    }

    const installedApps = await adbManager.apps.listPackages(false);
    const now = new Date();

    const syncedApps: App[] = [];

    for (const appInfo of installedApps) {
      const existing = db
        .select()
        .from(apps)
        .where(eq(apps.packageName, appInfo.packageName))
        .get();

      if (existing) {
        db.update(apps)
          .set({ lastSeen: now })
          .where(eq(apps.packageName, appInfo.packageName))
          .run();

        syncedApps.push({ ...existing, lastSeen: now });
      } else {
        const newApp: App = {
          packageName: appInfo.packageName,
          appName: null,
          isSystem: appInfo.isSystem,
          firstSeen: now,
          lastSeen: now,
        };

        db.insert(apps).values(newApp).run();
        syncedApps.push(newApp);
      }
    }

    return syncedApps;
  }

  async getApps(): Promise<App[]> {
    return db.select().from(apps).all();
  }

  async getBlockedApps(): Promise<BlockRule[]> {
    return db.select().from(blockRules).where(eq(blockRules.type, 'block')).all();
  }

  async blockApp(packageName: string, reason?: string): Promise<BlockRule> {
    // Ensure app exists in database
    const app = db.select().from(apps).where(eq(apps.packageName, packageName)).get();

    if (!app) {
      // Add to database if not exists
      db.insert(apps)
        .values({
          packageName,
          appName: null,
          isSystem: false,
          firstSeen: new Date(),
          lastSeen: new Date(),
        })
        .run();
    }

    // Check if already blocked
    const existingRule = db
      .select()
      .from(blockRules)
      .where(eq(blockRules.packageName, packageName))
      .get();

    if (existingRule && existingRule.type === 'block') {
      return existingRule;
    }

    // Disable app on device
    if (adbManager.isConnected()) {
      const result = await adbManager.apps.disableApp(packageName);
      if (!result.success) {
        throw new Error(`Failed to disable app: ${result.stderr}`);
      }
    }

    // Create block rule
    const rule: BlockRule = {
      id: uuidv4(),
      packageName,
      type: 'block',
      reason: reason || null,
      createdAt: new Date(),
    };

    if (existingRule) {
      db.update(blockRules)
        .set({ type: 'block', reason: reason || null, createdAt: new Date() })
        .where(eq(blockRules.id, existingRule.id))
        .run();
      return { ...existingRule, ...rule };
    }

    db.insert(blockRules).values(rule).run();
    return rule;
  }

  async unblockApp(packageName: string): Promise<void> {
    // Enable app on device
    if (adbManager.isConnected()) {
      const result = await adbManager.apps.enableApp(packageName);
      if (!result.success) {
        throw new Error(`Failed to enable app: ${result.stderr}`);
      }
    }

    // Remove block rule
    db.delete(blockRules).where(eq(blockRules.packageName, packageName)).run();
  }

  async forceStopApp(packageName: string): Promise<void> {
    if (!adbManager.isConnected()) {
      throw new Error('Device not connected');
    }

    const result = await adbManager.apps.forceStop(packageName);
    if (!result.success) {
      throw new Error(`Failed to force stop app: ${result.stderr}`);
    }
  }

  async isAppBlocked(packageName: string): Promise<boolean> {
    const rule = db
      .select()
      .from(blockRules)
      .where(eq(blockRules.packageName, packageName))
      .get();

    return rule?.type === 'block';
  }

  async enforceBlockRules(): Promise<void> {
    if (!adbManager.isConnected()) {
      return;
    }

    const rules = await this.getBlockedApps();

    for (const rule of rules) {
      const isEnabled = await adbManager.apps.isAppEnabled(rule.packageName);
      if (isEnabled) {
        await adbManager.apps.disableApp(rule.packageName);
      }
    }
  }
}

export const appBlockingService = new AppBlockingService();
