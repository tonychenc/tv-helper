import { useCallback } from 'react';

const API_BASE = '/api/v1';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export function useApi() {
  const connect = useCallback(async (host: string, port?: number) => {
    return fetchApi<{ success: boolean }>('/device/connect', {
      method: 'POST',
      body: JSON.stringify({ host, port }),
    });
  }, []);

  const disconnect = useCallback(async () => {
    return fetchApi<{ success: boolean }>('/device/disconnect', {
      method: 'POST',
    });
  }, []);

  const getDeviceStatus = useCallback(async () => {
    return fetchApi<{ state: string; deviceAddress: string | null }>('/device/status');
  }, []);

  const getApps = useCallback(async () => {
    return fetchApi<{ apps: App[] }>('/apps');
  }, []);

  const syncApps = useCallback(async () => {
    return fetchApi<{ success: boolean; count: number }>('/apps/sync', {
      method: 'POST',
    });
  }, []);

  const blockApp = useCallback(async (packageName: string, reason?: string) => {
    return fetchApi<{ success: boolean }>(`/apps/${packageName}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }, []);

  const unblockApp = useCallback(async (packageName: string) => {
    return fetchApi<{ success: boolean }>(`/apps/${packageName}/block`, {
      method: 'DELETE',
    });
  }, []);

  const killApp = useCallback(async (packageName: string) => {
    return fetchApi<{ success: boolean }>(`/apps/${packageName}/kill`, {
      method: 'POST',
    });
  }, []);

  const sendKey = useCallback(async (key: string) => {
    return fetchApi<{ success: boolean }>('/remote/key', {
      method: 'POST',
      body: JSON.stringify({ key }),
    });
  }, []);

  const powerOn = useCallback(async () => {
    return fetchApi<{ success: boolean }>('/remote/power/on', { method: 'POST' });
  }, []);

  const powerOff = useCallback(async () => {
    return fetchApi<{ success: boolean }>('/remote/power/off', { method: 'POST' });
  }, []);

  const getUsageToday = useCallback(async () => {
    return fetchApi<UsageToday>('/usage/today');
  }, []);

  const getUsageHistory = useCallback(async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return fetchApi<UsageHistory>(`/usage/history?${params}`);
  }, []);

  const getSchedules = useCallback(async () => {
    return fetchApi<{ schedules: Schedule[] }>('/schedules');
  }, []);

  const createSchedule = useCallback(async (schedule: NewSchedule) => {
    return fetchApi<{ success: boolean; schedule: Schedule }>('/schedules', {
      method: 'POST',
      body: JSON.stringify(schedule),
    });
  }, []);

  const updateSchedule = useCallback(async (id: string, schedule: Partial<Schedule>) => {
    return fetchApi<{ success: boolean; schedule: Schedule }>(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(schedule),
    });
  }, []);

  const deleteSchedule = useCallback(async (id: string) => {
    return fetchApi<{ success: boolean }>(`/schedules/${id}`, {
      method: 'DELETE',
    });
  }, []);

  return {
    connect,
    disconnect,
    getDeviceStatus,
    getApps,
    syncApps,
    blockApp,
    unblockApp,
    killApp,
    sendKey,
    powerOn,
    powerOff,
    getUsageToday,
    getUsageHistory,
    getSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  };
}

// Types
export interface App {
  packageName: string;
  appName: string | null;
  isSystem: boolean;
  isBlocked: boolean;
  firstSeen: string;
  lastSeen: string;
}

export interface UsageToday {
  date: string;
  totalTime: string;
  totalDurationMs: number;
  apps: { packageName: string; durationMs: number; duration: string }[];
  currentApp: { packageName: string; startTime: string } | null;
}

export interface UsageHistory {
  startDate: string;
  endDate: string;
  days: { date: string; totalDurationMs: number; appUsage: { packageName: string; durationMs: number }[] }[];
  totalDurationMs: number;
  averageDurationMs: number;
}

export interface Schedule {
  id: string;
  name: string;
  type: 'bedtime' | 'daily_limit' | 'app_schedule';
  enabled: boolean;
  startTime: string | null;
  endTime: string | null;
  dailyLimitMinutes: number | null;
  daysOfWeek: string | null;
  packageName: string | null;
  action: 'block' | 'warn' | 'power_off';
}

export interface NewSchedule {
  name: string;
  type: 'bedtime' | 'daily_limit' | 'app_schedule';
  enabled?: boolean;
  startTime?: string;
  endTime?: string;
  dailyLimitMinutes?: number;
  daysOfWeek?: number[];
  packageName?: string;
  action?: 'block' | 'warn' | 'power_off';
}
