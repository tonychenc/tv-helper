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

      const currentApp = await adbManager.apps.getRunningApp();

      // If browser is showing, block screen is displayed - don't re-launch
      if (this.isBlockScreenApp(currentApp)) {
        return;
      }

      // User is not in browser - show block screen
      await this.showBlockScreen(this.currentBlockReason);
    } catch (error) {
      console.error('Bedtime enforcement error:', error);
    }
  }

  private isBlockScreenApp(packageName: string | null): boolean {
    if (!packageName) return false;

    // Known browser packages
    const browserPackages = [
      'com.android.chrome',
      'com.chrome.beta',
      'com.chrome.dev',
      'com.google.android.browser',
      'com.android.browser',
      'org.chromium.webview_shell',
      'com.opera.browser',
      'com.opera.mini.native',
      'org.mozilla.firefox',
      'org.mozilla.fenix',
      'com.brave.browser',
      'com.microsoft.emmx',
      'com.amazon.cloud9',
      'com.vewd.core.integration.dia',
      'tv.plex.labs.web',
    ];

    if (browserPackages.includes(packageName)) {
      return true;
    }

    // Also check for common browser-related patterns
    const browserPatterns = ['browser', 'chrome', 'firefox', 'webview'];
    const lowerName = packageName.toLowerCase();
    return browserPatterns.some((pattern) => lowerName.includes(pattern));
  }

  private async showBlockScreen(reason: BlockReason): Promise<void> {
    const screenPath = reason === 'bedtime' ? '/block-screen/bedtime' : '/block-screen/limit';
    const url = `${this.serverUrl}${screenPath}`;

    try {
      // Force stop current app first (but not browsers)
      const currentApp = await adbManager.apps.getRunningApp();
      if (currentApp && !this.isBlockScreenApp(currentApp)) {
        await adbManager.apps.forceStop(currentApp);
      }

      // Launch the block screen URL
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
