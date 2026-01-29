import { EventEmitter } from 'events';
import { adbManager } from '../adb/AdbManager.js';
import { screenTimeService } from './ScreenTimeService.js';
import { config } from '../config/index.js';

export class BedtimeEnforcementService extends EventEmitter {
  private enforcementInterval: NodeJS.Timeout | null = null;
  private warningPlayed: boolean = false;

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
    this.warningPlayed = false;
  }

  private async enforcementLoop(): Promise<void> {
    if (!adbManager.isConnected()) {
      return;
    }

    try {
      const isScreenOn = await adbManager.power.isScreenOn();
      if (!isScreenOn) {
        return;
      }

      // Check if bedtime is active - turn off screen
      if (screenTimeService.isInBedtime()) {
        await adbManager.power.screenOff();
        this.emit('bedtime_screen_off', { reason: 'bedtime' });
        this.warningPlayed = false; // Reset for next cycle
        return;
      }

      // Check if bedtime is approaching (within 5 minutes) - play warning once
      const minutesUntilBedtime = screenTimeService.getMinutesUntilBedtime();

      if (minutesUntilBedtime !== null && minutesUntilBedtime <= 5 && minutesUntilBedtime > 0) {
        if (!this.warningPlayed) {
          await this.playWarningSound();
          this.warningPlayed = true;
          this.emit('bedtime_warning', { minutesRemaining: minutesUntilBedtime });
        }
      } else if (minutesUntilBedtime === null || minutesUntilBedtime > 5) {
        // Reset warning state when not approaching bedtime
        this.warningPlayed = false;
      }
    } catch (error) {
      console.error('Bedtime enforcement error:', error);
    }
  }

  private async playWarningSound(): Promise<void> {
    try {
      // Play notification sound multiple times to get attention
      await adbManager.input.playNotificationSound();

      // Wait a bit and play again
      setTimeout(async () => {
        await adbManager.input.playNotificationSound();
      }, 1000);

      console.log('Bedtime warning sound played');
    } catch (error) {
      console.error('Failed to play warning sound:', error);
    }
  }
}

export const bedtimeEnforcementService = new BedtimeEnforcementService();
