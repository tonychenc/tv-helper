import { useState, useEffect } from 'react';
import { useApi, type UsageToday, type UsageHistory } from '../../hooks/useApi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  currentApp: { packageName: string; startTime: string } | null;
  isConnected: boolean;
}

export default function Dashboard({ currentApp, isConnected }: DashboardProps) {
  const api = useApi();
  const [todayUsage, setTodayUsage] = useState<UsageToday | null>(null);
  const [history, setHistory] = useState<UsageHistory | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected) {
      loadData();
    }
  }, [isConnected]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [today, hist] = await Promise.all([api.getUsageToday(), api.getUsageHistory()]);
      setTodayUsage(today);
      setHistory(hist);
    } catch (error) {
      console.error('Failed to load usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">Connect to your Android TV to view usage statistics</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const chartData =
    history?.days.map((day) => ({
      date: day.date.slice(5), // MM-DD
      hours: Math.round((day.totalDurationMs / 3600000) * 10) / 10,
    })) || [];

  return (
    <div className="space-y-6">
      {/* Current App */}
      {currentApp && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm text-gray-400 mb-2">Currently Playing</h3>
          <div className="text-xl font-semibold">{currentApp.packageName}</div>
          <div className="text-sm text-gray-400">
            Started {new Date(currentApp.startTime).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm text-gray-400 mb-1">Today's Screen Time</h3>
          <div className="text-3xl font-bold">{todayUsage?.totalTime || '0m'}</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm text-gray-400 mb-1">Apps Used Today</h3>
          <div className="text-3xl font-bold">{todayUsage?.apps.length || 0}</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm text-gray-400 mb-1">7-Day Average</h3>
          <div className="text-3xl font-bold">
            {history ? formatDuration(history.averageDurationMs) : '0m'}
          </div>
        </div>
      </div>

      {/* Weekly Chart */}
      {chartData.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Screen Time - Last 7 Days</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" unit="h" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                  labelStyle={{ color: '#9CA3AF' }}
                  formatter={(value) => [`${value} hours`, 'Screen Time']}
                />
                <Bar dataKey="hours" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Apps Today */}
      {todayUsage && todayUsage.apps.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Top Apps Today</h3>
          <div className="space-y-3">
            {todayUsage.apps.slice(0, 5).map((app) => (
              <div key={app.packageName} className="flex items-center justify-between">
                <span className="text-gray-300">{app.packageName}</span>
                <span className="text-gray-400">{app.duration}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={loadData}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
      >
        Refresh
      </button>
    </div>
  );
}
