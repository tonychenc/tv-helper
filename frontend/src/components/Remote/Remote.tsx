import { useState } from 'react';
import { useApi } from '../../hooks/useApi';

interface RemoteProps {
  isConnected: boolean;
}

type RemoteKey =
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
  | 'power';

export default function Remote({ isConnected }: RemoteProps) {
  const api = useApi();
  const [sending, setSending] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);

  const sendKey = async (key: RemoteKey) => {
    if (!isConnected || sending) return;

    setSending(true);
    setLastKey(key);

    try {
      await api.sendKey(key);
    } catch (error) {
      console.error('Failed to send key:', error);
    } finally {
      setSending(false);
      setTimeout(() => setLastKey(null), 200);
    }
  };

  const handlePower = async (on: boolean) => {
    if (!isConnected) return;

    try {
      if (on) {
        await api.powerOn();
      } else {
        await api.powerOff();
      }
    } catch (error) {
      console.error('Failed to toggle power:', error);
    }
  };

  const handleAudioReminder = async () => {
    if (!isConnected) return;

    try {
      await api.playAudioReminder();
    } catch (error) {
      console.error('Failed to play audio reminder:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">Connect to your Android TV to use the remote</div>
      </div>
    );
  }

  const Button = ({
    keyName,
    label,
    className = '',
    size = 'normal',
  }: {
    keyName: RemoteKey;
    label: string;
    className?: string;
    size?: 'normal' | 'large';
  }) => (
    <button
      onClick={() => sendKey(keyName)}
      disabled={sending}
      className={`
        ${size === 'large' ? 'w-20 h-20' : 'w-14 h-14'}
        rounded-full bg-gray-700 hover:bg-gray-600 active:bg-gray-500
        flex items-center justify-center text-sm font-medium
        transition-all disabled:opacity-50
        ${lastKey === keyName ? 'ring-2 ring-blue-500 scale-95' : ''}
        ${className}
      `}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-gray-800 rounded-2xl p-6 space-y-6">
        {/* Power Row */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => handlePower(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
          >
            Power On
          </button>
          <button
            onClick={() => handlePower(false)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
          >
            Power Off
          </button>
        </div>

        {/* D-Pad */}
        <div className="flex flex-col items-center gap-2">
          <Button keyName="up" label="▲" />
          <div className="flex gap-2 items-center">
            <Button keyName="left" label="◀" />
            <Button keyName="select" label="OK" size="large" className="bg-blue-600 hover:bg-blue-700" />
            <Button keyName="right" label="▶" />
          </div>
          <Button keyName="down" label="▼" />
        </div>

        {/* Navigation Row */}
        <div className="flex justify-center gap-4">
          <Button keyName="back" label="Back" className="w-16" />
          <Button keyName="home" label="Home" className="w-16" />
          <Button keyName="menu" label="Menu" className="w-16" />
        </div>

        {/* Media Controls */}
        <div className="flex justify-center">
          <Button keyName="play_pause" label="⏯" size="large" />
        </div>

        {/* Volume Controls */}
        <div className="flex justify-center items-center gap-4">
          <Button keyName="volume_down" label="Vol-" />
          <Button keyName="mute" label="Mute" />
          <Button keyName="volume_up" label="Vol+" />
        </div>

        {/* Test Audio Reminder */}
        <div className="pt-4 border-t border-gray-700">
          <button
            onClick={handleAudioReminder}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
          >
            Test Audio Reminder
          </button>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-4 text-center text-sm text-gray-500">
        Tip: You can also use keyboard arrows, Enter, and Escape for navigation
      </div>
    </div>
  );
}
