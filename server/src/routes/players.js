import { Router } from 'express';
import Player from '../models/Player.js';

const router = Router();

// ── Sync player state (upsert) ───────────────────────────────────────────────
router.post('/sync', async (req, res) => {
  const { deviceId, name, coins, spins, shields, buildings, attacks } = req.body;
  if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
  try {
    const player = await Player.findOneAndUpdate(
      { deviceId },
      { name, coins, spins, shields, buildings, attacks, lastSeen: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ ok: true, id: player._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Random raid target (active in last 7 days, not yourself) ─────────────────
router.get('/raid-target', async (req, res) => {
  const { deviceId } = req.query;
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const pool  = await Player.find({
      deviceId: { $ne: deviceId || '' },
      lastSeen: { $gte: since },
    }).limit(30).lean();

    if (!pool.length) return res.json(null);  // client falls back to fake target
    res.json(pool[Math.floor(Math.random() * pool.length)]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Record a raid hit ────────────────────────────────────────────────────────
router.post('/attack/:targetId', async (req, res) => {
  const { buildingIndex, stolenCoins } = req.body;
  try {
    const target = await Player.findById(req.params.targetId);
    if (!target) return res.status(404).json({ error: 'Target not found' });

    if (target.shields > 0) {
      target.shields--;
      await target.save();
      return res.json({ blocked: true });
    }

    if (target.buildings[buildingIndex] > 0) {
      target.buildings[buildingIndex]--;
      target.markModified('buildings');
    }
    target.coins = Math.max(0, target.coins - stolenCoins);
    await target.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Leaderboard (top 10 by coins) ────────────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
  try {
    const top = await Player
      .find()
      .sort({ coins: -1 })
      .limit(10)
      .select('name coins buildings')
      .lean();
    res.json(top);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
