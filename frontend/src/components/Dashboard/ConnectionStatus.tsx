import { useState } from 'react';

interface ConnectionStatusProps {
  status: {
    state: 'disconnected' | 'connecting' | 'connected' | 'error';
    deviceAddress: string | null;
    deviceModel: string | null;
    error: string | null;
  };
  onConnect: (host: string, port?: number) => Promise<unknown>;
  onDisconnect: () => Promise<unknown>;
}

export default function ConnectionStatus({ status, onConnect, onDisconnect }: ConnectionStatusProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [host, setHost] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    if (!host) return;

    setLoading(true);
    setError('');

    try {
      await onConnect(host);
      setShowDialog(false);
      setHost('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await onDisconnect();
    } finally {
      setLoading(false);
    }
  };

  const stateColors = {
    disconnected: 'bg-gray-500',
    connecting: 'bg-yellow-500 animate-pulse',
    connected: 'bg-green-500',
    error: 'bg-red-500',
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${stateColors[status.state]}`} />
          <span className="text-sm text-gray-300">
            {status.state === 'connected'
              ? status.deviceModel || status.deviceAddress
              : status.state === 'error'
              ? status.error || 'Error'
              : status.state === 'connecting'
              ? 'Connecting...'
              : 'Disconnected'}
          </span>
        </div>

        {status.state === 'connected' ? (
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={() => setShowDialog(true)}
            disabled={loading || status.state === 'connecting'}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
          >
            Connect
          </button>
        )}
      </div>

      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Connect to Android TV</h2>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">TV IP Address</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.100"
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={!host || loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
