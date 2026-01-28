import { Router } from 'express';
import { adbManager } from '../../adb/AdbManager.js';
import { auditService } from '../../services/AuditService.js';
import { validateBody, connectSchema } from '../middleware/validation.js';

const router = Router();

router.get('/status', async (_req, res) => {
  try {
    const status = adbManager.getStatus();
    let deviceInfo = null;

    if (status.state === 'connected') {
      deviceInfo = await adbManager.stats.getDeviceInfo();
    }

    res.json({
      ...status,
      deviceInfo,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get device status' });
  }
});

router.post('/connect', validateBody(connectSchema), async (req, res) => {
  try {
    const { host, port } = req.body;
    const success = await adbManager.connect(host, port);

    if (success) {
      await auditService.log('device_connect', host, { port });
      const status = adbManager.getStatus();
      res.json({ success: true, status });
    } else {
      res.status(400).json({ success: false, error: 'Failed to connect to device' });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/disconnect', async (_req, res) => {
  try {
    const previousAddress = adbManager.getStatus().deviceAddress;
    await adbManager.disconnect();

    if (previousAddress) {
      await auditService.log('device_disconnect', previousAddress);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

router.get('/info', async (_req, res) => {
  try {
    if (!adbManager.isConnected()) {
      res.status(400).json({ error: 'Device not connected' });
      return;
    }

    const [deviceInfo, batteryInfo, storageInfo] = await Promise.all([
      adbManager.stats.getDeviceInfo(),
      adbManager.stats.getBatteryInfo(),
      adbManager.stats.getStorageInfo(),
    ]);

    res.json({
      device: deviceInfo,
      battery: batteryInfo,
      storage: storageInfo,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get device info' });
  }
});

export default router;
