// All API calls are fire-and-forget safe — errors are swallowed so the game
// always works offline. The server is a nice-to-have, not a hard dependency.

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function post(path, body) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

async function get(path) {
  try {
    const res = await fetch(`${BASE}${path}`);
    return res.ok ? res.json() : null;
  } catch { return null; }
}

export function syncPlayer(state) {
  return post('/sync', {
    deviceId:  state.deviceId,
    name:      state.playerName,
    coins:     state.coins,
    spins:     state.spins,
    shields:   state.shields,
    buildings: state.buildings,
    attacks:   state.attacks,
  });
}

export function getRaidTarget(deviceId) {
  return get(`/raid-target?deviceId=${deviceId}`);
}

export function recordAttack(targetId, buildingIndex, stolenCoins) {
  return post(`/attack/${targetId}`, { buildingIndex, stolenCoins });
}

export function getLeaderboard() {
  return get('/leaderboard');
}
