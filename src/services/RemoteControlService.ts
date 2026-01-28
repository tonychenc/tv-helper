import { adbManager } from '../adb/AdbManager.js';
import { KeyCodes, type KeyCode } from '../adb/commands/InputCommands.js';

export type RemoteKey =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'select'
  | 'back'
  | 'home'
  | 'menu'
  | 'play_pause'
  | 'volume_up'
  | 'volume_down'
  | 'mute'
  | 'power'
  | 'channel_up'
  | 'channel_down';

const keyMap: Record<RemoteKey, KeyCode> = {
  up: KeyCodes.DPAD_UP,
  down: KeyCodes.DPAD_DOWN,
  left: KeyCodes.DPAD_LEFT,
  right: KeyCodes.DPAD_RIGHT,
  select: KeyCodes.DPAD_CENTER,
  back: KeyCodes.BACK,
  home: KeyCodes.HOME,
  menu: KeyCodes.MENU,
  play_pause: KeyCodes.MEDIA_PLAY_PAUSE,
  volume_up: KeyCodes.VOLUME_UP,
  volume_down: KeyCodes.VOLUME_DOWN,
  mute: KeyCodes.VOLUME_MUTE,
  power: KeyCodes.POWER,
  channel_up: KeyCodes.CHANNEL_UP,
  channel_down: KeyCodes.CHANNEL_DOWN,
};

export class RemoteControlService {
  async sendKey(key: RemoteKey): Promise<void> {
    if (!adbManager.isConnected()) {
      throw new Error('Device not connected');
    }

    const keyCode = keyMap[key];
    if (!keyCode) {
      throw new Error(`Unknown key: ${key}`);
    }

    const result = await adbManager.input.sendKeyEvent(keyCode);
    if (!result.success) {
      throw new Error(`Failed to send key: ${result.stderr}`);
    }
  }

  async sendKeyCode(keyCode: number): Promise<void> {
    if (!adbManager.isConnected()) {
      throw new Error('Device not connected');
    }

    const result = await adbManager.input.sendKeyEvent(keyCode);
    if (!result.success) {
      throw new Error(`Failed to send key code: ${result.stderr}`);
    }
  }

  async sendText(text: string): Promise<void> {
    if (!adbManager.isConnected()) {
      throw new Error('Device not connected');
    }

    const result = await adbManager.input.sendText(text);
    if (!result.success) {
      throw new Error(`Failed to send text: ${result.stderr}`);
    }
  }

  async powerOn(): Promise<void> {
    if (!adbManager.isConnected()) {
      throw new Error('Device not connected');
    }

    await adbManager.power.screenOn();
  }

  async powerOff(): Promise<void> {
    if (!adbManager.isConnected()) {
      throw new Error('Device not connected');
    }

    await adbManager.power.screenOff();
  }

  async togglePower(): Promise<void> {
    if (!adbManager.isConnected()) {
      throw new Error('Device not connected');
    }

    await adbManager.power.togglePower();
  }

  async isScreenOn(): Promise<boolean> {
    if (!adbManager.isConnected()) {
      throw new Error('Device not connected');
    }

    return adbManager.power.isScreenOn();
  }

  async setBrightness(level: number): Promise<void> {
    if (!adbManager.isConnected()) {
      throw new Error('Device not connected');
    }

    const result = await adbManager.power.setBrightness(level);
    if (!result.success) {
      throw new Error(`Failed to set brightness: ${result.stderr}`);
    }
  }

  async getBrightness(): Promise<number | null> {
    if (!adbManager.isConnected()) {
      throw new Error('Device not connected');
    }

    return adbManager.power.getBrightness();
  }

  async getVolume(): Promise<number | null> {
    if (!adbManager.isConnected()) {
      throw new Error('Device not connected');
    }

    return adbManager.power.getVolume();
  }

  getAvailableKeys(): RemoteKey[] {
    return Object.keys(keyMap) as RemoteKey[];
  }
}

export const remoteControlService = new RemoteControlService();
