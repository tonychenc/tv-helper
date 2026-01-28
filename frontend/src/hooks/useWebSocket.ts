import { useState, useEffect, useCallback, useRef } from 'react';

interface ConnectionStatus {
  state: 'disconnected' | 'connecting' | 'connected' | 'error';
  deviceAddress: string | null;
  deviceModel: string | null;
  lastHealthCheck: string | null;
  error: string | null;
}

interface CurrentApp {
  packageName: string;
  startTime: string;
}

interface WebSocketState {
  status: ConnectionStatus;
  currentApp: CurrentApp | null;
  isInBedtime: boolean;
}

export function useWebSocket() {
  const [state, setState] = useState<WebSocketState>({
    status: {
      state: 'disconnected',
      deviceAddress: null,
      deviceModel: null,
      lastHealthCheck: null,
      error: null,
    },
    currentApp: null,
    isInBedtime: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | undefined>(undefined);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'init':
            setState({
              status: message.data.connectionStatus,
              currentApp: message.data.currentApp,
              isInBedtime: message.data.isInBedtime,
            });
            break;

          case 'connection_status':
            setState((prev) => ({ ...prev, status: message.data }));
            break;

          case 'app_changed':
            setState((prev) => ({ ...prev, currentApp: message.data }));
            break;

          case 'bedtime_started':
            setState((prev) => ({ ...prev, isInBedtime: true }));
            break;

          case 'bedtime_ended':
            setState((prev) => ({ ...prev, isInBedtime: false }));
            break;

          case 'pong':
            // Heartbeat response
            break;
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      wsRef.current = null;

      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();

    // Heartbeat
    const heartbeatInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return state;
}
