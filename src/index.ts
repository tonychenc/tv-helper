import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { initializeDatabase } from './db/index.js';
import apiRoutes from './api/routes/index.js';
import blockScreenRoutes from './api/routes/block-screen.js';
import { setupWebSocket } from './api/websocket/handler.js';
import { pinAuth } from './api/middleware/auth.js';
import { rateLimit } from './api/middleware/rateLimit.js';
import { usageMonitorService } from './services/UsageMonitorService.js';
import { screenTimeService } from './services/ScreenTimeService.js';
import { appBlockingService } from './services/AppBlockingService.js';
import { bedtimeEnforcementService } from './services/BedtimeEnforcementService.js';
import { adbManager } from './adb/AdbManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('Initializing TV Helper...');

  // Initialize database
  initializeDatabase();
  console.log('Database initialized');

  // Create Express app
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(rateLimit());

  // API routes with optional PIN auth
  app.use('/api/v1', pinAuth, apiRoutes);

  // Block screen routes (no auth - served to TV)
  app.use('/block-screen', blockScreenRoutes);

  // Serve static frontend files
  const frontendPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendPath));

  // SPA fallback - Express 5 requires named params, so use regex
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });

  // Create HTTP server
  const server = createServer(app);

  // Setup WebSocket
  setupWebSocket(server);

  // Start services
  screenTimeService.start();
  console.log('Screen time service started');

  // Compute server URL for block screens (TV needs to reach this URL)
  const serverUrl = config.serverUrl || `http://${config.host}:${config.port}`;

  // Start usage monitoring when connected
  adbManager.onStatusChange((status) => {
    if (status.state === 'connected') {
      usageMonitorService.start();
      console.log('Usage monitoring started');

      // Enforce block rules on connect
      appBlockingService.enforceBlockRules();

      // Start bedtime enforcement with server URL for block screens
      bedtimeEnforcementService.start(serverUrl);
      console.log('Bedtime enforcement started');
    } else if (status.state === 'disconnected' || status.state === 'error') {
      usageMonitorService.stop();
      bedtimeEnforcementService.stop();
      console.log('Usage monitoring stopped');
    }
  });

  // Start server
  server.listen(config.port, config.host, () => {
    console.log(`\nTV Helper is running!`);
    console.log(`  Local:    http://${config.host}:${config.port}`);
    console.log(`  API:      http://${config.host}:${config.port}/api/v1`);
    console.log(`  WebSocket: ws://${config.host}:${config.port}/ws`);

    if (config.pin) {
      console.log(`\n  PIN authentication is enabled`);
    } else {
      console.log(`\n  Warning: No PIN configured, API is unprotected`);
    }

    console.log(`\nTo connect to your Android TV:`);
    console.log(`  1. Enable ADB over WiFi on your TV`);
    console.log(`     Settings > Developer Options > Network debugging`);
    console.log(`  2. POST to /api/v1/device/connect with {"host": "TV_IP_ADDRESS"}`);
    console.log(`  3. Accept the connection prompt on your TV\n`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');

    usageMonitorService.stop();
    screenTimeService.stop();
    bedtimeEnforcementService.stop();

    await adbManager.disconnect();

    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Failed to start:', error);
  process.exit(1);
});
