import { AdbCommandExecutor, CommandResult } from '../AdbCommandExecutor.js';
import { KeyCodes } from './InputCommands.js';

export class PowerCommands {
  constructor(private executor: AdbCommandExecutor) {}

  async isScreenOn(): Promise<boolean> {
    const result = await this.executor.execute('shell dumpsys power | grep "mWakefulness"');

    if (!result.success) {
      return false;
    }

    return result.stdout.includes('Awake');
  }

  async screenOn(): Promise<CommandResult> {
    const isOn = await this.isScreenOn();
    if (isOn) {
      return { success: true, stdout: 'Screen already on', stderr: '' };
    }
    return this.executor.execute(`shell input keyevent ${KeyCodes.WAKEUP}`);
  }

  async screenOff(): Promise<CommandResult> {
    const isOn = await this.isScreenOn();
    if (!isOn) {
      return { success: true, stdout: 'Screen already off', stderr: '' };
    }
    return this.executor.execute(`shell input keyevent ${KeyCodes.SLEEP}`);
  }

  async togglePower(): Promise<CommandResult> {
    return this.executor.execute(`shell input keyevent ${KeyCodes.POWER}`);
  }

  async getBrightness(): Promise<number | null> {
    const result = await this.executor.execute('shell settings get system screen_brightness');

    if (!result.success) {
      return null;
    }

    const brightness = parseInt(result.stdout, 10);
    return isNaN(brightness) ? null : brightness;
  }

  async setBrightness(level: number): Promise<CommandResult> {
    // Brightness ranges from 0-255
    const clampedLevel = Math.max(0, Math.min(255, Math.round(level)));
    return this.executor.execute(`shell settings put system screen_brightness ${clampedLevel}`);
  }

  async getBrightnessMode(): Promise<'auto' | 'manual' | null> {
    const result = await this.executor.execute('shell settings get system screen_brightness_mode');

    if (!result.success) {
      return null;
    }

    return result.stdout === '1' ? 'auto' : 'manual';
  }

  async setBrightnessMode(mode: 'auto' | 'manual'): Promise<CommandResult> {
    const value = mode === 'auto' ? 1 : 0;
    return this.executor.execute(`shell settings put system screen_brightness_mode ${value}`);
  }

  async getVolume(): Promise<number | null> {
    const result = await this.executor.execute(
      'shell dumpsys audio | grep "STREAM_MUSIC" -A 5 | grep "Current"'
    );

    if (!result.success) {
      return null;
    }

    const match = result.stdout.match(/Current[^:]*:\s*(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  async reboot(): Promise<CommandResult> {
    return this.executor.execute('reboot');
  }
}
