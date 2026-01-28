import { Router } from 'express';
import { remoteControlService, type RemoteKey } from '../../services/RemoteControlService.js';
import { auditService } from '../../services/AuditService.js';
import {
  validateBody,
  keyEventSchema,
  keyCodeSchema,
  textInputSchema,
  brightnessSchema,
} from '../middleware/validation.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

// Rate limit remote control endpoints more strictly
const remoteRateLimit = rateLimit({ windowMs: 1000, max: 20 });

router.get('/keys', async (_req, res) => {
  try {
    const keys = remoteControlService.getAvailableKeys();
    res.json({ keys });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get available keys' });
  }
});

router.post('/key', remoteRateLimit, validateBody(keyEventSchema), async (req, res) => {
  try {
    const { key } = req.body as { key: RemoteKey };
    await remoteControlService.sendKey(key);
    await auditService.log('remote_key', key);

    res.json({ success: true, key });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send key';
    res.status(500).json({ error: message });
  }
});

router.post('/keycode', remoteRateLimit, validateBody(keyCodeSchema), async (req, res) => {
  try {
    const { keyCode } = req.body;
    await remoteControlService.sendKeyCode(keyCode);
    await auditService.log('remote_key', `keycode:${keyCode}`);

    res.json({ success: true, keyCode });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send key code';
    res.status(500).json({ error: message });
  }
});

router.post('/text', remoteRateLimit, validateBody(textInputSchema), async (req, res) => {
  try {
    const { text } = req.body;
    await remoteControlService.sendText(text);

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send text';
    res.status(500).json({ error: message });
  }
});

router.get('/power/status', async (_req, res) => {
  try {
    const isOn = await remoteControlService.isScreenOn();
    res.json({ screenOn: isOn });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get power status';
    res.status(500).json({ error: message });
  }
});

router.post('/power/on', async (_req, res) => {
  try {
    await remoteControlService.powerOn();
    await auditService.log('power_on');

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to power on';
    res.status(500).json({ error: message });
  }
});

router.post('/power/off', async (_req, res) => {
  try {
    await remoteControlService.powerOff();
    await auditService.log('power_off');

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to power off';
    res.status(500).json({ error: message });
  }
});

router.post('/power/toggle', async (_req, res) => {
  try {
    await remoteControlService.togglePower();

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to toggle power';
    res.status(500).json({ error: message });
  }
});

router.get('/brightness', async (_req, res) => {
  try {
    const level = await remoteControlService.getBrightness();
    res.json({ brightness: level });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get brightness';
    res.status(500).json({ error: message });
  }
});

router.post('/brightness', validateBody(brightnessSchema), async (req, res) => {
  try {
    const { level } = req.body;
    await remoteControlService.setBrightness(level);
    await auditService.log('brightness_change', undefined, { level });

    res.json({ success: true, brightness: level });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to set brightness';
    res.status(500).json({ error: message });
  }
});

router.get('/volume', async (_req, res) => {
  try {
    const level = await remoteControlService.getVolume();
    res.json({ volume: level });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get volume';
    res.status(500).json({ error: message });
  }
});

export default router;
