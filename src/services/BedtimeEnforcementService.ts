import { EventEmitter } from 'events';
import { adbManager } from '../adb/AdbManager.js';
import { screenTimeService } from './ScreenTimeService.js';
import { config } from '../config/index.js';

export type BlockReason = 'bedtime' | 'daily_limit';

export class BedtimeEnforcementService extends EventEmitter {
  private enforcementInterval: NodeJS.Timeout | null = null;
  private serverUrl: string = '';
  private currentBlockReason: BlockReason | null = null;

  start(serverUrl: string): void {
    if (this.enforcementInterval) {
      return;
    }

    this.serverUrl = serverUrl;

    this.enforcementInterval = setInterval(() => {
      this.enforcementLoop();
    }, config.bedtime.enforcementInterval);

    // Listen for daily limit reached events
    screenTimeService.on('limitReached', (data) => {
      this.currentBlockReason = 'daily_limit';
      this.showBlockScreen('daily_limit');
    });

    // Initial check
    this.enforcementLoop();
  }

  stop(): void {
    if (this.enforcementInterval) {
      clearInterval(this.enforcementInterval);
      this.enforcementInterval = null;
    }
    this.currentBlockReason = null;
  }

  private async enforcementLoop(): Promise<void> {
    if (!adbManager.isConnected()) {
      return;
    }

    // Check bedtime
    if (screenTimeService.isInBedtime()) {
      this.currentBlockReason = 'bedtime';
    } else if (this.currentBlockReason === 'bedtime') {
      // Bedtime ended, clear the block reason
      this.currentBlockReason = null;
    }

    if (!this.currentBlockReason) {
      return;
    }

    try {
      const isScreenOn = await adbManager.power.isScreenOn();
      if (!isScreenOn) {
        return;
      }

      // Check if already showing the block screen
      const currentApp = await adbManager.apps.getRunningApp();
      if (this.isBlockScreenApp(currentApp)) {
        return;
      }

      // Show the appropriate block screen
      await this.showBlockScreen(this.currentBlockReason);
    } catch (error) {
      console.error('Bedtime enforcement error:', error);
    }
  }

  private isBlockScreenApp(packageName: string | null): boolean {
    if (!packageName) return false;
    // Browser packages that might be showing our block screen
    const browserPackages = [
      'com.android.chrome',
      'com.google.android.browser',
      'org.chromium.webview_shell',
      'com.opera.browser',
      'org.mozilla.firefox',
      'com.brave.browser',
      'com.microsoft.emmx',
    ];
    return browserPackages.includes(packageName);
  }

  private async showBlockScreen(reason: BlockReason): Promise<void> {
    const screenPath = reason === 'bedtime' ? '/block-screen/bedtime' : '/block-screen/limit';
    const url = `${this.serverUrl}${screenPath}`;

    try {
      // Force stop current app first
      const currentApp = await adbManager.apps.getRunningApp();
      if (currentApp && !this.isBlockScreenApp(currentApp)) {
        await adbManager.apps.forceStop(currentApp);
      }

      // Launch the block screen
      await adbManager.apps.launchUrl(url);

      this.emit('block_screen_shown', { reason, url });
    } catch (error) {
      console.error('Failed to show block screen:', error);
      // Fallback: turn off the screen
      await adbManager.power.screenOff();
      this.emit('block_screen_fallback', { reason, error: String(error) });
    }
  }

  // Allow external trigger for daily limit
  triggerDailyLimit(): void {
    this.currentBlockReason = 'daily_limit';
    this.showBlockScreen('daily_limit');
  }

  // Clear daily limit block (e.g., when a new day starts)
  clearDailyLimit(): void {
    if (this.currentBlockReason === 'daily_limit') {
      this.currentBlockReason = null;
    }
  }
}

export const bedtimeEnforcementService = new BedtimeEnforcementService();
