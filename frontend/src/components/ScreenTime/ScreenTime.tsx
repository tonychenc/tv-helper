import { useState, useEffect } from 'react';
import { useApi, type Schedule, type NewSchedule } from '../../hooks/useApi';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ScreenTime() {
  const api = useApi();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const { schedules } = await api.getSchedules();
      setSchedules(schedules);
    } catch (error) {
      console.error('Failed to load schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: NewSchedule) => {
    try {
      await api.createSchedule(data);
      await loadSchedules();
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create schedule:', error);
    }
  };

  const handleUpdate = async (id: string, data: Partial<Schedule>) => {
    try {
      await api.updateSchedule(id, data);
      await loadSchedules();
      setEditingSchedule(null);
    } catch (error) {
      console.error('Failed to update schedule:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      await api.deleteSchedule(id);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    }
  };

  const handleToggle = async (schedule: Schedule) => {
    await handleUpdate(schedule.id, { enabled: !schedule.enabled });
  };

  const formatDays = (daysJson: string | null): string => {
    if (!daysJson) return 'Every day';
    try {
      const days = JSON.parse(daysJson) as number[];
      if (days.length === 7) return 'Every day';
      if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
      if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
      return days.map((d) => DAYS[d]).join(', ');
    } catch {
      return 'Every day';
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Screen Time Schedules</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          Add Schedule
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No schedules yet. Create one to manage screen time.
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{schedule.name}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        schedule.type === 'bedtime'
                          ? 'bg-purple-900 text-purple-300'
                          : schedule.type === 'daily_limit'
                          ? 'bg-orange-900 text-orange-300'
                          : 'bg-blue-900 text-blue-300'
                      }`}
                    >
                      {schedule.type.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-gray-400 space-y-1">
                    {schedule.type === 'bedtime' && (
                      <p>
                        {schedule.startTime} - {schedule.endTime}
                      </p>
                    )}
                    {schedule.type === 'daily_limit' && (
                      <p>
                        {schedule.dailyLimitMinutes} minutes/day
                        {schedule.packageName && ` for ${schedule.packageName}`}
                      </p>
                    )}
                    <p>{formatDays(schedule.daysOfWeek)}</p>
                    <p>Action: {schedule.action.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(schedule)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      schedule.enabled ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        schedule.enabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>

                  <button
                    onClick={() => setEditingSchedule(schedule)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(schedule.id)}
                    className="p-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showForm || editingSchedule) && (
        <ScheduleForm
          schedule={editingSchedule}
          onSubmit={(data) => {
            if (editingSchedule) {
              // Convert daysOfWeek for update
              const updateData: Partial<Schedule> = {
                name: data.name,
                type: data.type,
                enabled: data.enabled,
                startTime: data.startTime || null,
                endTime: data.endTime || null,
                dailyLimitMinutes: data.dailyLimitMinutes || null,
                daysOfWeek: data.daysOfWeek ? JSON.stringify(data.daysOfWeek) : null,
                packageName: data.packageName || null,
                action: data.action || 'block',
              };
              handleUpdate(editingSchedule.id, updateData);
            } else {
              handleCreate(data);
            }
          }}
          onClose={() => {
            setShowForm(false);
            setEditingSchedule(null);
          }}
        />
      )}
    </div>
  );
}

function ScheduleForm({
  schedule,
  onSubmit,
  onClose,
}: {
  schedule: Schedule | null;
  onSubmit: (data: NewSchedule) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(schedule?.name || '');
  const [type, setType] = useState<'bedtime' | 'daily_limit' | 'app_schedule'>(
    schedule?.type || 'bedtime'
  );
  const [startTime, setStartTime] = useState(schedule?.startTime || '22:00');
  const [endTime, setEndTime] = useState(schedule?.endTime || '07:00');
  const [dailyLimitMinutes, setDailyLimitMinutes] = useState(schedule?.dailyLimitMinutes || 60);
  const [packageName, setPackageName] = useState(schedule?.packageName || '');
  const [action, setAction] = useState<'block' | 'warn' | 'power_off'>(schedule?.action || 'block');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(() => {
    if (schedule?.daysOfWeek) {
      try {
        return JSON.parse(schedule.daysOfWeek);
      } catch {
        return [0, 1, 2, 3, 4, 5, 6];
      }
    }
    return [0, 1, 2, 3, 4, 5, 6];
  });

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: NewSchedule = {
      name,
      type,
      startTime: type === 'bedtime' || type === 'app_schedule' ? startTime : undefined,
      endTime: type === 'bedtime' ? endTime : undefined,
      dailyLimitMinutes: type === 'daily_limit' ? dailyLimitMinutes : undefined,
      packageName: type !== 'bedtime' && packageName ? packageName : undefined,
      action,
      daysOfWeek,
    };

    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">
          {schedule ? 'Edit Schedule' : 'Create Schedule'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="bedtime">Bedtime</option>
              <option value="daily_limit">Daily Limit</option>
              <option value="app_schedule">App Schedule</option>
            </select>
          </div>

          {(type === 'bedtime' || type === 'app_schedule') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              {type === 'bedtime' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {type === 'daily_limit' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Daily Limit (minutes)</label>
              <input
                type="number"
                value={dailyLimitMinutes}
                onChange={(e) => setDailyLimitMinutes(parseInt(e.target.value, 10))}
                min={1}
                max={1440}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          {type !== 'bedtime' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Package Name (optional)</label>
              <input
                type="text"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                placeholder="com.example.app"
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Days</label>
            <div className="flex gap-2">
              {DAYS.map((day, i) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`w-10 h-10 rounded text-sm font-medium transition-colors ${
                    daysOfWeek.includes(i)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as typeof action)}
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="block">Block apps</option>
              <option value="warn">Warn only</option>
              <option value="power_off">Turn off TV</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              {schedule ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
