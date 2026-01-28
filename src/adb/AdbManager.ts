import { AdbCommandExecutor, CommandResult } from './AdbCommandExecutor.js';
import { AdbConnectionMonitor, ConnectionStatus } from './AdbConnectionMonitor.js';
import { AppCommands } from './commands/AppCommands.js';
import { InputCommands } from './commands/InputCommands.js';
import { PowerCommands } from './commands/PowerCommands.js';
import { StatsCommands } from './commands/StatsCommands.js';

export class AdbManager {
  private static instance: AdbManager | null = null;

  private executor: AdbCommandExecutor;
  private monitor: AdbConnectionMonitor;

  public readonly apps: AppCommands;
  public readonly input: InputCommands;
  public readonly power: PowerCommands;
  public readonly stats: StatsCommands;

  private constructor() {
    this.executor = new AdbCommandExecutor();
    this.monitor = new AdbConnectionMonitor(this.executor);

    this.apps = new AppCommands(this.executor);
    this.input = new InputCommands(this.executor);
    this.power = new PowerCommands(this.executor);
    this.stats = new StatsCommands(this.executor);
  }

  static getInstance(): AdbManager {
    if (!AdbManager.instance) {
      AdbManager.instance = new AdbManager();
    }
    return AdbManager.instance;
  }

  async connect(host: string, port?: number): Promise<boolean> {
    return this.monitor.connect(host, port);
  }

  async disconnect(): Promise<void> {
    return this.monitor.disconnect();
  }

  getStatus(): ConnectionStatus {
    return this.monitor.getStatus();
  }

  isConnected(): boolean {
    return this.monitor.getStatus().state === 'connected';
  }

  onStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.monitor.on('status', callback);
  }

  onError(callback: (error: string) => void): void {
    this.monitor.on('error', callback);
  }

  async executeShell(command: string): Promise<CommandResult> {
    return this.executor.execute(`shell ${command}`);
  }
}

export const adbManager = AdbManager.getInstance();
