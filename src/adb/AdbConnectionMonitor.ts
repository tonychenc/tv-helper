import { EventEmitter } from 'events';
import { AdbCommandExecutor } from './AdbCommandExecutor.js';
import { config } from '../config/index.js';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ConnectionStatus {
  state: ConnectionState;
  deviceAddress: string | null;
  deviceModel: string | null;
  lastHealthCheck: Date | null;
  error: string | null;
}

export class AdbConnectionMonitor extends EventEmitter {
  private executor: AdbCommandExecutor;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private status: ConnectionStatus = {
    state: 'disconnected',
    deviceAddress: null,
    deviceModel: null,
    lastHealthCheck: null,
    error: null,
  };

  constructor(executor: AdbCommandExecutor) {
    super();
    this.executor = executor;
  }

  getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  async connect(host: string, port = config.adb.defaultPort): Promise<boolean> {
    const address = `${host}:${port}`;

    this.updateStatus({ state: 'connecting', deviceAddress: address, error: null });
    this.emit('connecting', address);

    try {
      // First disconnect any existing connection
      await this.executor.executeRaw(`adb disconnect ${address}`);

      // Connect to the device
      const connectResult = await this.executor.executeRaw(`adb connect ${address}`);

      if (!connectResult.success ||
          (!connectResult.stdout.includes('connected') && !connectResult.stdout.includes('already connected'))) {
        throw new Error(connectResult.stderr || connectResult.stdout || 'Connection failed');
      }

      this.executor.setDevice(address);

      // Verify connection and get device model
      const modelResult = await this.executor.execute('shell getprop ro.product.model');

      if (!modelResult.success) {
        throw new Error('Failed to communicate with device');
      }

      this.updateStatus({
        state: 'connected',
        deviceModel: modelResult.stdout || 'Unknown',
        lastHealthCheck: new Date(),
      });

      this.startHealthCheck();
      this.emit('connected', this.status);

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.updateStatus({ state: 'error', error: message });
      this.emit('error', message);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.stopHealthCheck();

    if (this.status.deviceAddress) {
      await this.executor.executeRaw(`adb disconnect ${this.status.deviceAddress}`);
    }

    this.executor.setDevice(null);
    this.updateStatus({
      state: 'disconnected',
      deviceAddress: null,
      deviceModel: null,
      error: null,
    });

    this.emit('disconnected');
  }

  private startHealthCheck() {
    this.stopHealthCheck();

    this.healthCheckInterval = setInterval(async () => {
      await this.checkHealth();
    }, config.adb.healthCheckInterval);
  }

  private stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private async checkHealth(): Promise<boolean> {
    if (this.status.state !== 'connected') {
      return false;
    }

    const result = await this.executor.execute('shell echo ok', 1);

    if (result.success && result.stdout === 'ok') {
      this.updateStatus({ lastHealthCheck: new Date() });
      return true;
    }

    // Try to reconnect
    if (this.status.deviceAddress) {
      const [host, port] = this.status.deviceAddress.split(':');
      const reconnected = await this.connect(host, parseInt(port, 10));

      if (!reconnected) {
        this.updateStatus({ state: 'error', error: 'Lost connection to device' });
        this.emit('error', 'Lost connection to device');
      }

      return reconnected;
    }

    return false;
  }

  private updateStatus(updates: Partial<ConnectionStatus>) {
    this.status = { ...this.status, ...updates };
    this.emit('status', this.status);
  }
}
