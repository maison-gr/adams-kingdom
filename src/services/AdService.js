// AdService — wraps @capacitor-community/admob.
// Falls back silently in the browser so dev mode is unaffected.
//
// TEST unit IDs are used by default (initializeForTesting: true in capacitor.config.json).
// Before publishing: replace AD_UNITS with your real AdMob unit IDs from admob.google.com.

const AD_UNITS = {
  interstitial: {
    android: 'ca-app-pub-3940256099942544/1033173712', // test interstitial
    ios:     'ca-app-pub-3940256099942544/4411468910',
  },
  rewarded: {
    android: 'ca-app-pub-3940256099942544/5224354917', // test rewarded
    ios:     'ca-app-pub-3940256099942544/1712485313',
  },
  banner: {
    android: 'ca-app-pub-3940256099942544/6300978111', // test banner
    ios:     'ca-app-pub-3940256099942544/2934735716',
  },
};

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

function platform() {
  return isAndroid() ? 'android' : 'ios';
}

async function getAdMob() {
  try {
    const mod = await import('@capacitor-community/admob');
    return mod.AdMob;
  } catch (_) {
    return null; // running in browser — no AdMob
  }
}

class AdServiceClass {
  constructor() {
    this._initialized   = false;
    this._interReady    = false;
    this._rewardedReady = false;
  }

  async init() {
    const AdMob = await getAdMob();
    if (!AdMob) return;
    try {
      await AdMob.initialize({ testingDevices: [], initializeForTesting: true });
      this._initialized = true;
      await this._preloadInterstitial();
    } catch (_) {}
  }

  // ─── INTERSTITIAL ─────────────────────────────────────────────────────────

  async _preloadInterstitial() {
    const AdMob = await getAdMob();
    if (!AdMob || !this._initialized) return;
    try {
      await AdMob.prepareInterstitial({ adId: AD_UNITS.interstitial[platform()] });
      this._interReady = true;
    } catch (_) {}
  }

  // Call after village complete or boss victory — fire-and-forget.
  async showInterstitial() {
    const AdMob = await getAdMob();
    if (!AdMob || !this._initialized || !this._interReady) return;
    try {
      this._interReady = false;
      await AdMob.showInterstitial();
      // Reload for next time in background
      this._preloadInterstitial();
    } catch (_) {}
  }

  // ─── REWARDED ─────────────────────────────────────────────────────────────

  async _preloadRewarded() {
    const AdMob = await getAdMob();
    if (!AdMob || !this._initialized) return;
    try {
      await AdMob.prepareRewardVideoAd({ adId: AD_UNITS.rewarded[platform()] });
      this._rewardedReady = true;
    } catch (_) {}
  }

  // Returns true if the user watched the ad and earned the reward.
  // In browser (no AdMob), resolves true immediately so dev testing works.
  async showRewarded() {
    const AdMob = await getAdMob();
    if (!AdMob || !this._initialized) {
      // Browser fallback — simulate ad watched
      await new Promise(r => setTimeout(r, 800));
      return true;
    }
    if (!this._rewardedReady) {
      await this._preloadRewarded();
    }
    return new Promise(resolve => {
      let rewarded = false;
      AdMob.addListener('onRewardedVideoAdRewarded', () => { rewarded = true; });
      AdMob.addListener('onRewardedVideoAdClosed',   () => {
        this._rewardedReady = false;
        this._preloadRewarded();
        resolve(rewarded);
      });
      AdMob.showRewardVideoAd().catch(() => resolve(false));
    });
  }

  // ─── BANNER ───────────────────────────────────────────────────────────────

  async showBanner() {
    const AdMob = await getAdMob();
    if (!AdMob || !this._initialized) return;
    try {
      const { BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');
      await AdMob.showBanner({
        adId:     AD_UNITS.banner[platform()],
        adSize:   BannerAdSize.SMART_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin:   0,
      });
    } catch (_) {}
  }

  async hideBanner() {
    const AdMob = await getAdMob();
    if (!AdMob) return;
    try { await AdMob.hideBanner(); } catch (_) {}
  }
}

export const adService = new AdServiceClass();
