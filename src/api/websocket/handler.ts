import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { adbManager } from '../../adb/AdbManager.js';
import { usageMonitorService } from '../../services/UsageMonitorService.js';
import { screenTimeService } from '../../services/ScreenTimeService.js';
import { bedtimeEnforcementService } from '../../services/BedtimeEnforcementService.js';
import { config } from '../../config/index.js';

interface WebSocketMessage {
  type: string;
  data?: unknown;
}

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  const broadcast = (message: WebSocketMessage) => {
    const data = JSON.stringify(message);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  };

  // ADB connection status changes
  adbManager.onStatusChange((status) => {
    broadcast({ type: 'connection_status', data: status });
  });

  adbManager.onError((error) => {
    broadcast({ type: 'connection_error', data: { error } });
  });

  // Usage monitoring events
  usageMonitorService.on('appChanged', (data) => {
    broadcast({ type: 'app_changed', data });
  });

  usageMonitorService.on('sessionEnded', (data) => {
    broadcast({ type: 'session_ended', data });
  });

  // Screen time events
  screenTimeService.on('bedtimeStarted', (schedule) => {
    broadcast({ type: 'bedtime_started', data: { scheduleId: schedule.id, name: schedule.name } });
  });

  screenTimeService.on('bedtimeEnded', (schedule) => {
    broadcast({ type: 'bedtime_ended', data: { scheduleId: schedule.id, name: schedule.name } });
  });

  screenTimeService.on('limitReached', (data) => {
    broadcast({
      type: 'limit_reached',
      data: {
        packageName: data.schedule.packageName,
        scheduleName: data.schedule.name,
        usageMinutes: Math.floor(data.usageMs / 60000),
        limitMinutes: Math.floor(data.limitMs / 60000),
      },
    });
  });

  // Bedtime enforcement events
  bedtimeEnforcementService.on('block_screen_shown', (data) => {
    broadcast({ type: 'block_screen_shown', data });
  });

  bedtimeEnforcementService.on('block_screen_fallback', (data) => {
    broadcast({ type: 'block_screen_fallback', data });
  });

  wss.on('connection', (ws, req) => {
    // PIN authentication for WebSocket
    if (config.pin) {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const providedPin = url.searchParams.get('pin');

      if (providedPin !== config.pin) {
        ws.close(4001, 'Invalid PIN');
        return;
      }
    }

    // Send current status on connect
    ws.send(
      JSON.stringify({
        type: 'init',
        data: {
          connectionStatus: adbManager.getStatus(),
          currentApp: usageMonitorService.getCurrentApp(),
          isInBedtime: screenTimeService.isInBedtime(),
        },
      })
    );

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message.toString()) as WebSocketMessage;

        // Handle ping/pong for keepalive
        if (parsed.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        // Ignore invalid messages
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return wss;
}
