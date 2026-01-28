import { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useApi } from './hooks/useApi';
import ConnectionStatus from './components/Dashboard/ConnectionStatus';
import AppManager from './components/AppManager/AppManager';
import Remote from './components/Remote/Remote';
import Dashboard from './components/Dashboard/Dashboard';
import ScreenTime from './components/ScreenTime/ScreenTime';

type Tab = 'dashboard' | 'apps' | 'remote' | 'schedules';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { status, currentApp, isInBedtime } = useWebSocket();
  const api = useApi();

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'apps', label: 'Apps' },
    { id: 'remote', label: 'Remote' },
    { id: 'schedules', label: 'Screen Time' },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">TV Helper</h1>
            <ConnectionStatus status={status} onConnect={api.connect} onDisconnect={api.disconnect} />
          </div>
        </div>
      </header>

      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {isInBedtime && (
        <div className="bg-purple-900 border-b border-purple-700 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <span className="text-purple-300">Bedtime mode is active</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard currentApp={currentApp} isConnected={status.state === 'connected'} />
        )}
        {activeTab === 'apps' && <AppManager isConnected={status.state === 'connected'} />}
        {activeTab === 'remote' && <Remote isConnected={status.state === 'connected'} />}
        {activeTab === 'schedules' && <ScreenTime />}
      </main>
    </div>
  );
}
