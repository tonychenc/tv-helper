import { useState, useEffect } from 'react';
import { useApi, type App } from '../../hooks/useApi';

interface AppManagerProps {
  isConnected: boolean;
}

export default function AppManager({ isConnected }: AppManagerProps) {
  const api = useApi();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'blocked'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isConnected) {
      loadApps();
    }
  }, [isConnected]);

  const loadApps = async () => {
    setLoading(true);
    try {
      const { apps } = await api.getApps();
      setApps(apps);
    } catch (error) {
      console.error('Failed to load apps:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncApps = async () => {
    setSyncing(true);
    try {
      await api.syncApps();
      await loadApps();
    } catch (error) {
      console.error('Failed to sync apps:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleBlock = async (packageName: string) => {
    try {
      await api.blockApp(packageName);
      setApps((prev) =>
        prev.map((app) => (app.packageName === packageName ? { ...app, isBlocked: true } : app))
      );
    } catch (error) {
      console.error('Failed to block app:', error);
    }
  };

  const handleUnblock = async (packageName: string) => {
    try {
      await api.unblockApp(packageName);
      setApps((prev) =>
        prev.map((app) => (app.packageName === packageName ? { ...app, isBlocked: false } : app))
      );
    } catch (error) {
      console.error('Failed to unblock app:', error);
    }
  };

  const handleKill = async (packageName: string) => {
    try {
      await api.killApp(packageName);
    } catch (error) {
      console.error('Failed to kill app:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">Connect to your Android TV to manage apps</div>
      </div>
    );
  }

  const filteredApps = apps
    .filter((app) => {
      if (filter === 'blocked') return app.isBlocked;
      return true;
    })
    .filter((app) => {
      if (!search) return true;
      return app.packageName.toLowerCase().includes(search.toLowerCase());
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded transition-colors ${
              filter === 'all' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            All Apps ({apps.length})
          </button>
          <button
            onClick={() => setFilter('blocked')}
            className={`px-4 py-2 rounded transition-colors ${
              filter === 'blocked' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Blocked ({apps.filter((a) => a.isBlocked).length})
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search apps..."
            className="px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={syncApps}
            disabled={syncing}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync Apps'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : filteredApps.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          {apps.length === 0 ? 'No apps found. Click "Sync Apps" to fetch from TV.' : 'No matching apps'}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Package Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Status</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredApps.map((app) => (
                <tr key={app.packageName} className="hover:bg-gray-750">
                  <td className="px-4 py-3">
                    <div className="font-medium">{app.packageName}</div>
                    {app.appName && <div className="text-sm text-gray-400">{app.appName}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {app.isBlocked ? (
                      <span className="px-2 py-1 text-xs bg-red-900 text-red-300 rounded">Blocked</span>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-green-900 text-green-300 rounded">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {app.isBlocked ? (
                      <button
                        onClick={() => handleUnblock(app.packageName)}
                        className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 rounded transition-colors"
                      >
                        Unblock
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBlock(app.packageName)}
                        className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded transition-colors"
                      >
                        Block
                      </button>
                    )}
                    <button
                      onClick={() => handleKill(app.packageName)}
                      className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                    >
                      Kill
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
