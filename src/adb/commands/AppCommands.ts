import { AdbCommandExecutor, CommandResult } from '../AdbCommandExecutor.js';

export interface AppInfo {
  packageName: string;
  isSystem: boolean;
}

export class AppCommands {
  constructor(private executor: AdbCommandExecutor) {}

  async listPackages(includeSystem = false): Promise<AppInfo[]> {
    const flag = includeSystem ? '' : '-3';
    const result = await this.executor.execute(`shell pm list packages ${flag}`);

    if (!result.success) {
      return [];
    }

    const packages = result.stdout
      .split('\n')
      .filter((line) => line.startsWith('package:'))
      .map((line) => ({
        packageName: line.replace('package:', '').trim(),
        isSystem: false,
      }));

    return packages;
  }

  async getAppName(packageName: string): Promise<string | null> {
    const result = await this.executor.execute(
      `shell dumpsys package ${packageName} | grep -A1 "labelRes=" | head -1`
    );

    if (!result.success) {
      return null;
    }

    // Try to extract app label from the output
    const match = result.stdout.match(/label="([^"]+)"/);
    return match ? match[1] : packageName;
  }

  async disableApp(packageName: string): Promise<CommandResult> {
    return this.executor.execute(`shell pm disable-user --user 0 ${packageName}`);
  }

  async enableApp(packageName: string): Promise<CommandResult> {
    return this.executor.execute(`shell pm enable ${packageName}`);
  }

  async forceStop(packageName: string): Promise<CommandResult> {
    return this.executor.execute(`shell am force-stop ${packageName}`);
  }

  async isAppEnabled(packageName: string): Promise<boolean> {
    const result = await this.executor.execute(
      `shell pm list packages -e | grep ${packageName}`
    );

    return result.success && result.stdout.includes(packageName);
  }

  async getRunningApp(): Promise<string | null> {
    const result = await this.executor.execute(
      'shell dumpsys activity activities | grep mResumedActivity'
    );

    if (!result.success || !result.stdout) {
      return null;
    }

    // Parse: mResumedActivity: ActivityRecord{... com.package/.Activity ...}
    const match = result.stdout.match(/([a-zA-Z0-9_.]+)\/[a-zA-Z0-9_.]+/);
    return match ? match[1] : null;
  }

  async clearAppData(packageName: string): Promise<CommandResult> {
    return this.executor.execute(`shell pm clear ${packageName}`);
  }
}
