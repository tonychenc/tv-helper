import { AdbCommandExecutor, CommandResult } from '../AdbCommandExecutor.js';

export const KeyCodes = {
  // Navigation
  DPAD_UP: 19,
  DPAD_DOWN: 20,
  DPAD_LEFT: 21,
  DPAD_RIGHT: 22,
  DPAD_CENTER: 23,
  ENTER: 66,

  // System
  HOME: 3,
  BACK: 4,
  MENU: 82,
  SEARCH: 84,

  // Power
  POWER: 26,
  SLEEP: 223,
  WAKEUP: 224,

  // Volume
  VOLUME_UP: 24,
  VOLUME_DOWN: 25,
  VOLUME_MUTE: 164,

  // Media
  MEDIA_PLAY_PAUSE: 85,
  MEDIA_STOP: 86,
  MEDIA_NEXT: 87,
  MEDIA_PREVIOUS: 88,
  MEDIA_REWIND: 89,
  MEDIA_FAST_FORWARD: 90,

  // TV-specific
  TV: 170,
  TV_INPUT: 178,
  GUIDE: 172,
  DVR: 173,
  SETTINGS: 176,
  CHANNEL_UP: 166,
  CHANNEL_DOWN: 167,
} as const;

export type KeyCode = (typeof KeyCodes)[keyof typeof KeyCodes];

export class InputCommands {
  constructor(private executor: AdbCommandExecutor) {}

  async sendKeyEvent(keyCode: number): Promise<CommandResult> {
    return this.executor.execute(`shell input keyevent ${keyCode}`);
  }

  async sendText(text: string): Promise<CommandResult> {
    // Escape special characters and spaces
    const escaped = text.replace(/(['"\\$`!])/g, '\\$1').replace(/ /g, '%s');
    return this.executor.execute(`shell input text "${escaped}"`);
  }

  async tap(x: number, y: number): Promise<CommandResult> {
    return this.executor.execute(`shell input tap ${x} ${y}`);
  }

  async swipe(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    durationMs = 300
  ): Promise<CommandResult> {
    return this.executor.execute(
      `shell input swipe ${startX} ${startY} ${endX} ${endY} ${durationMs}`
    );
  }

  // Convenience methods
  async pressUp(): Promise<CommandResult> {
    return this.sendKeyEvent(KeyCodes.DPAD_UP);
  }

  async pressDown(): Promise<CommandResult> {
    return this.sendKeyEvent(KeyCodes.DPAD_DOWN);
  }

  async pressLeft(): Promise<CommandResult> {
    return this.sendKeyEvent(KeyCodes.DPAD_LEFT);
  }

  async pressRight(): Promise<CommandResult> {
    return this.sendKeyEvent(KeyCodes.DPAD_RIGHT);
  }

  async pressSelect(): Promise<CommandResult> {
    return this.sendKeyEvent(KeyCodes.DPAD_CENTER);
  }

  async pressHome(): Promise<CommandResult> {
    return this.sendKeyEvent(KeyCodes.HOME);
  }

  async pressBack(): Promise<CommandResult> {
    return this.sendKeyEvent(KeyCodes.BACK);
  }

  async pressMenu(): Promise<CommandResult> {
    return this.sendKeyEvent(KeyCodes.MENU);
  }

  async volumeUp(): Promise<CommandResult> {
    return this.sendKeyEvent(KeyCodes.VOLUME_UP);
  }

  async volumeDown(): Promise<CommandResult> {
    return this.sendKeyEvent(KeyCodes.VOLUME_DOWN);
  }

  async mute(): Promise<CommandResult> {
    return this.sendKeyEvent(KeyCodes.VOLUME_MUTE);
  }

  async playPause(): Promise<CommandResult> {
    return this.sendKeyEvent(KeyCodes.MEDIA_PLAY_PAUSE);
  }

  async playNotificationSound(): Promise<CommandResult> {
    // Play the default notification sound on the TV
    return this.executor.execute(
      'shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///system/media/audio/ui/Dock.ogg'
    );
  }

  async playAlarmSound(): Promise<CommandResult> {
    // Use media player to play an alarm-like sound
    return this.executor.execute(
      'shell am start -a android.intent.action.VIEW -d file:///system/media/audio/ringtones/Ring_Synth_04.ogg -t audio/ogg'
    );
  }

  async speakText(text: string): Promise<CommandResult> {
    // Use Android TTS to speak text (requires TTS engine)
    return this.executor.execute(
      `shell am broadcast -a android.speech.tts.TTS_QUEUE_PROCESSING_COMPLETED -e text "${text}"`
    );
  }
}
