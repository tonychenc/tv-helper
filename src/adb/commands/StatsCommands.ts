import { AdbCommandExecutor } from '../AdbCommandExecutor.js';

export interface ProcessStats {
  packageName: string;
  cpuPercent: number;
  memoryKb: number;
}

export interface BatteryInfo {
  level: number;
  status: string;
  plugged: boolean;
}

export class StatsCommands {
  constructor(private executor: AdbCommandExecutor) {}

  async getCurrentActivity(): Promise<{ packageName: string; activityName: string } | null> {
    const result = await this.executor.execute(
      'shell dumpsys activity activities | grep mResumedActivity'
    );

    if (!result.success || !result.stdout) {
      return null;
    }

    // Parse: mResumedActivity: ActivityRecord{hash u0 com.package/.ActivityName t123}
    const match = result.stdout.match(/([a-zA-Z0-9_.]+)\/([a-zA-Z0-9_.]+)/);

    if (!match) {
      return null;
    }

    return {
      packageName: match[1],
      activityName: match[2],
    };
  }

  async getRunningProcesses(): Promise<ProcessStats[]> {
    const result = await this.executor.execute('shell ps -A -o NAME,CPU,RSS');

    if (!result.success) {
      return [];
    }

    const lines = result.stdout.split('\n').slice(1); // Skip header
    const processes: ProcessStats[] = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 3) {
        processes.push({
          packageName: parts[0],
          cpuPercent: parseFloat(parts[1]) || 0,
          memoryKb: parseInt(parts[2], 10) || 0,
        });
      }
    }

    return processes;
  }

  async getDeviceInfo(): Promise<Record<string, string>> {
    const props = [
      'ro.product.model',
      'ro.product.manufacturer',
      'ro.build.version.release',
      'ro.build.version.sdk',
      'ro.serialno',
    ];

    const info: Record<string, string> = {};

    for (const prop of props) {
      const result = await this.executor.execute(`shell getprop ${prop}`);
      if (result.success && result.stdout) {
        const key = prop.split('.').pop() || prop;
        info[key] = result.stdout;
      }
    }

    return info;
  }

  async getBatteryInfo(): Promise<BatteryInfo | null> {
    const result = await this.executor.execute('shell dumpsys battery');

    if (!result.success) {
      return null;
    }

    const levelMatch = result.stdout.match(/level:\s*(\d+)/);
    const statusMatch = result.stdout.match(/status:\s*(\d+)/);
    const pluggedMatch = result.stdout.match(/plugged:\s*(\d+)/);

    if (!levelMatch) {
      return null;
    }

    const statusMap: Record<string, string> = {
      '1': 'Unknown',
      '2': 'Charging',
      '3': 'Discharging',
      '4': 'Not charging',
      '5': 'Full',
    };

    return {
      level: parseInt(levelMatch[1], 10),
      status: statusMap[statusMatch?.[1] || '1'] || 'Unknown',
      plugged: parseInt(pluggedMatch?.[1] || '0', 10) > 0,
    };
  }

  async getStorageInfo(): Promise<{ total: number; used: number; free: number } | null> {
    const result = await this.executor.execute('shell df /data');

    if (!result.success) {
      return null;
    }

    const lines = result.stdout.split('\n');
    if (lines.length < 2) {
      return null;
    }

    const parts = lines[1].trim().split(/\s+/);
    if (parts.length < 4) {
      return null;
    }

    const parseSize = (s: string): number => {
      const match = s.match(/^(\d+)([KMGT])?$/i);
      if (!match) return parseInt(s, 10) || 0;
      const num = parseInt(match[1], 10);
      const unit = (match[2] || '').toUpperCase();
      const multipliers: Record<string, number> = { K: 1024, M: 1024 ** 2, G: 1024 ** 3, T: 1024 ** 4 };
      return num * (multipliers[unit] || 1);
    };

    return {
      total: parseSize(parts[1]),
      used: parseSize(parts[2]),
      free: parseSize(parts[3]),
    };
  }
}
