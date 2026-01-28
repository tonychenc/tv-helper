import { EventEmitter } from 'events';
import { adbManager } from '../adb/AdbManager.js';
import { screenTimeService } from './ScreenTimeService.js';
import { config } from '../config/index.js';

export class BedtimeEnforcementService extends EventEmitter {
  private enforcementInterval: NodeJS.Timeout | null = null;

  start(): void {
    if (this.enforcementInterval) {
      return;
    }

    this.enforcementInterval = setInterval(() => {
      this.enforcementLoop();
    }, config.bedtime.enforcementInterval);

    // Initial check
    this.enforcementLoop();
  }

  stop(): void {
    if (this.enforcementInterval) {
      clearInterval(this.enforcementInterval);
      this.enforcementInterval = null;
    }
  }

  private async enforcementLoop(): Promise<void> {
    if (!adbManager.isConnected()) {
      return;
    }

    if (!screenTimeService.isInBedtime()) {
      return;
    }

    try {
      const isScreenOn = await adbManager.power.isScreenOn();

      if (!isScreenOn) {
        return;
      }

      // Screen is on during bedtime - turn it off
      await adbManager.power.screenOff();
      this.emit('bedtime_screen_off', { reason: 'bedtime_enforcement' });
    } catch (error) {
      console.error('Bedtime enforcement error:', error);
    }
  }
}

export const bedtimeEnforcementService = new BedtimeEnforcementService();
