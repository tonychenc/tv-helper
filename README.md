# TV Helper - Android TV Parental Control

A web-based parental control application for Android TV using ADB over WiFi.

## Features

- **App Blocking**: Disable/enable apps on the TV
- **Screen Time Management**: Set bedtime schedules and daily limits
- **Usage Monitoring**: Track app usage with real-time updates
- **Remote Control**: Navigate and control the TV from the web UI
- **Real-time Updates**: WebSocket-based live status updates

## Prerequisites

- Node.js 18+
- ADB (Android Debug Bridge) installed and in PATH
- Android TV with Developer Options enabled

## Setup

1. Install dependencies:
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

2. Build the frontend:
   ```bash
   npm run build:frontend
   ```

3. Start the server:
   ```bash
   npm run dev      # Development mode with hot reload
   # or
   npm run build && npm start  # Production mode
   ```

4. Open http://localhost:3000 in your browser

## Connecting to Android TV

1. **Enable Developer Options on TV**:
   - Go to Settings > About > Build number
   - Click Build number 7 times to enable Developer Options

2. **Enable ADB over WiFi**:
   - Go to Settings > Developer Options
   - Enable "Network debugging" or "ADB over network"
   - Note the IP address shown

3. **Connect via Web UI**:
   - Click "Connect" in the header
   - Enter the TV's IP address
   - Accept the connection prompt on the TV (first time only)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `HOST` | 127.0.0.1 | Server host (use 0.0.0.0 for LAN access) |
| `PIN` | - | Optional PIN for authentication |
| `DB_PATH` | ./data/tv-helper.db | SQLite database path |

## API Endpoints

### Device
- `GET /api/v1/device/status` - Connection status
- `POST /api/v1/device/connect` - Connect to TV
- `POST /api/v1/device/disconnect` - Disconnect from TV

### Apps
- `GET /api/v1/apps` - List installed apps
- `POST /api/v1/apps/sync` - Sync apps from TV
- `POST /api/v1/apps/:pkg/block` - Block an app
- `DELETE /api/v1/apps/:pkg/block` - Unblock an app
- `POST /api/v1/apps/:pkg/kill` - Force stop an app

### Screen Time
- `GET /api/v1/schedules` - List schedules
- `POST /api/v1/schedules` - Create schedule
- `PUT /api/v1/schedules/:id` - Update schedule
- `DELETE /api/v1/schedules/:id` - Delete schedule

### Usage
- `GET /api/v1/usage/current` - Current foreground app
- `GET /api/v1/usage/today` - Today's usage summary
- `GET /api/v1/usage/history` - Usage history

### Remote Control
- `POST /api/v1/remote/key` - Send key event
- `POST /api/v1/remote/power/on` - Turn TV on
- `POST /api/v1/remote/power/off` - Turn TV off

## WebSocket

Connect to `ws://localhost:3000/ws` for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  // Types: init, connection_status, app_changed, bedtime_started, limit_reached
};
```

## Security

- By default, the server binds to localhost only
- Set `PIN` environment variable for authentication
- All sensitive actions are logged to the audit log

## Project Structure

```
tv-helper/
├── src/
│   ├── index.ts              # Entry point
│   ├── config/               # Configuration
│   ├── adb/                  # ADB management
│   │   ├── AdbManager.ts     # Connection manager
│   │   └── commands/         # ADB command implementations
│   ├── services/             # Business logic
│   ├── api/                  # REST API
│   │   ├── routes/           # Express routes
│   │   ├── middleware/       # Auth, validation
│   │   └── websocket/        # Real-time updates
│   └── db/                   # Database schema
├── frontend/                 # React SPA
│   └── src/
│       ├── components/       # UI components
│       └── hooks/            # React hooks
└── data/                     # SQLite database
```

## License

ISC
