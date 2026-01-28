import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from '../config/index.js';

const execAsync = promisify(exec);

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: Error;
}

interface QueuedCommand {
  command: string;
  resolve: (result: CommandResult) => void;
  retries: number;
}

export class AdbCommandExecutor {
  private queue: QueuedCommand[] = [];
  private processing = false;
  private deviceAddress: string | null = null;

  setDevice(address: string | null) {
    this.deviceAddress = address;
  }

  getDevice(): string | null {
    return this.deviceAddress;
  }

  async execute(command: string, retries = config.adb.maxRetries): Promise<CommandResult> {
    return new Promise((resolve) => {
      this.queue.push({ command, resolve, retries });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      const result = await this.executeCommand(item.command, item.retries);
      item.resolve(result);
    }

    this.processing = false;
  }

  private async executeCommand(command: string, retriesLeft: number): Promise<CommandResult> {
    if (!this.deviceAddress) {
      return {
        success: false,
        stdout: '',
        stderr: 'No device connected',
        error: new Error('No device connected'),
      };
    }

    const fullCommand = `adb -s ${this.deviceAddress} ${command}`;

    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout: config.adb.commandTimeout,
      });

      return {
        success: true,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      };
    } catch (error) {
      const err = error as Error & { stdout?: string; stderr?: string };

      if (retriesLeft > 0) {
        await this.delay(1000);
        return this.executeCommand(command, retriesLeft - 1);
      }

      return {
        success: false,
        stdout: err.stdout?.trim() || '',
        stderr: err.stderr?.trim() || '',
        error: err,
      };
    }
  }

  async executeRaw(command: string): Promise<CommandResult> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: config.adb.commandTimeout,
      });

      return {
        success: true,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      };
    } catch (error) {
      const err = error as Error & { stdout?: string; stderr?: string };
      return {
        success: false,
        stdout: err.stdout?.trim() || '',
        stderr: err.stderr?.trim() || '',
        error: err,
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
