import { LocalNotifications } from '@capacitor/local-notifications';
import { GameState } from '../GameState.js';

const REFILL_INTERVAL = 5 * 60 * 1000;
const MAX_SPINS       = 50;
const PASSIVE_CAP_MS  = 4 * 60 * 60 * 1000;

const ID_SPINS   = 1;
const ID_BONUS   = 2;
const ID_INCOME  = 3;

const isNative = () => !!window.Capacitor?.isNativePlatform?.();

export const NotificationService = {
  async init() {
    if (!isNative()) return;

    const { display } = await LocalNotifications.requestPermissions();
    if (display !== 'granted') return;

    // Schedule whenever the app goes to background
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.scheduleAll();
    });
  },

  async scheduleAll() {
    if (!isNative()) return;

    // Cancel stale notifications before rescheduling
    await LocalNotifications.cancel({
      notifications: [{ id: ID_SPINS }, { id: ID_BONUS }, { id: ID_INCOME }],
    });

    const notifications = [];
    const now = Date.now();

    // Spins-full: fires when the last missing spin is refilled
    if (GameState.spins < MAX_SPINS) {
      const spinsNeeded = MAX_SPINS - GameState.spins;
      const fullAt = GameState.refillAt + (spinsNeeded - 1) * REFILL_INTERVAL;
      if (fullAt > now) {
        notifications.push({
          id:    ID_SPINS,
          title: "Adam's Kingdom 🎡",
          body:  "Your spins are full! Come back and spin the wheel.",
          schedule: { at: new Date(fullAt) },
        });
      }
    }

    // Daily bonus: fires at the start of the next calendar day
    const nextDayMs = (Math.floor(now / 86400000) + 1) * 86400000 + 60_000;
    notifications.push({
      id:    ID_BONUS,
      title: "Adam's Kingdom 🎁",
      body:  "Your daily bonus is ready! Claim it before your streak resets.",
      schedule: { at: new Date(nextDayMs) },
    });

    // Passive income cap: fires when buildings hit the 4-hour earnings cap
    if (GameState.passiveRatePerHour() > 0) {
      const capAt = GameState.passiveCoinsAt + PASSIVE_CAP_MS;
      if (capAt > now) {
        notifications.push({
          id:    ID_INCOME,
          title: "Adam's Kingdom 💰",
          body:  "Your buildings are overflowing! Collect your coins before they stop.",
          schedule: { at: new Date(capAt) },
        });
      }
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  },
};
