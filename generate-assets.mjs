// Generates resources/icon.png (1024×1024) and resources/splash.png (2732×2732)
// from inline SVG using sharp (installed with @capacitor/assets).
// Run: node generate-assets.mjs

import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('resources', { recursive: true });

// ─── ICON SVG (1024×1024) ────────────────────────────────────────────────────
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="62%">
      <stop offset="0%" stop-color="#1E0A4A"/>
      <stop offset="100%" stop-color="#06041C"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFD700" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#FFD700" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1024" height="1024" fill="url(#bg)" rx="160"/>

  <!-- Glow halo behind crown -->
  <ellipse cx="512" cy="420" rx="300" ry="200" fill="url(#glow)"/>

  <!-- Stars scattered -->
  <circle cx="160" cy="180" r="5"  fill="#FFD700" opacity="0.55"/>
  <circle cx="240" cy="310" r="3"  fill="#FFD700" opacity="0.4"/>
  <circle cx="860" cy="200" r="5"  fill="#FFD700" opacity="0.55"/>
  <circle cx="790" cy="330" r="3"  fill="#FFD700" opacity="0.4"/>
  <circle cx="100" cy="490" r="3"  fill="#FFD700" opacity="0.3"/>
  <circle cx="924" cy="470" r="3"  fill="#FFD700" opacity="0.3"/>

  <!-- ── CROWN ── -->
  <!-- Crown base band -->
  <rect x="248" y="480" width="528" height="100" fill="#B8860B" rx="8"/>
  <rect x="248" y="480" width="528" height="36"  fill="#FFD700" rx="8"/>
  <!-- Jewels on band -->
  <ellipse cx="340" cy="530" rx="22" ry="22" fill="#CC1133"/>
  <ellipse cx="340" cy="530" rx="14" ry="14" fill="#FF2244"/>
  <ellipse cx="512" cy="530" rx="26" ry="26" fill="#CC1133"/>
  <ellipse cx="512" cy="530" rx="17" ry="17" fill="#FF3355"/>
  <ellipse cx="684" cy="530" rx="22" ry="22" fill="#CC1133"/>
  <ellipse cx="684" cy="530" rx="14" ry="14" fill="#FF2244"/>
  <!-- Sapphires -->
  <ellipse cx="426" cy="530" rx="16" ry="16" fill="#0044CC"/>
  <ellipse cx="426" cy="530" rx="10" ry="10" fill="#2266FF"/>
  <ellipse cx="598" cy="530" rx="16" ry="16" fill="#0044CC"/>
  <ellipse cx="598" cy="530" rx="10" ry="10" fill="#2266FF"/>

  <!-- Crown spikes (5 points) -->
  <!-- Far-left spike -->
  <polygon points="248,480 296,310 344,480" fill="#B8860B"/>
  <polygon points="256,480 296,318 336,480" fill="#FFD700"/>
  <!-- Left-center spike -->
  <polygon points="358,480 416,270 474,480" fill="#B8860B"/>
  <polygon points="366,480 416,278 466,480" fill="#FFD700"/>
  <!-- Center spike (tallest) -->
  <polygon points="464,480 512,220 560,480" fill="#B8860B"/>
  <polygon points="472,480 512,228 552,480" fill="#FFD700"/>
  <!-- Right-center spike -->
  <polygon points="550,480 608,270 666,480" fill="#B8860B"/>
  <polygon points="558,480 608,278 658,480" fill="#FFD700"/>
  <!-- Far-right spike -->
  <polygon points="680,480 728,310 776,480" fill="#B8860B"/>
  <polygon points="688,480 728,318 768,480" fill="#FFD700"/>

  <!-- Spike tip gems -->
  <circle cx="296" cy="308" r="14" fill="#FFD700"/>
  <circle cx="296" cy="308" r="8"  fill="#FFFDE7"/>
  <circle cx="416" cy="268" r="16" fill="#FFD700"/>
  <circle cx="416" cy="268" r="9"  fill="#FFFDE7"/>
  <circle cx="512" cy="218" r="20" fill="#FFD700"/>
  <circle cx="512" cy="218" r="11" fill="#FFFDE7"/>
  <circle cx="608" cy="268" r="16" fill="#FFD700"/>
  <circle cx="608" cy="268" r="9"  fill="#FFFDE7"/>
  <circle cx="728" cy="308" r="14" fill="#FFD700"/>
  <circle cx="728" cy="308" r="8"  fill="#FFFDE7"/>

  <!-- Crown shine -->
  <rect x="256" y="480" width="512" height="16" fill="white" opacity="0.12" rx="5"/>

  <!-- ── CASTLE SILHOUETTE BELOW CROWN ── -->
  <!-- Main tower body -->
  <rect x="400" y="580" width="224" height="260" fill="#1C1848"/>
  <!-- Main tower battlements -->
  <rect x="390" y="558" width="50" height="36" fill="#1C1848" rx="3"/>
  <rect x="456" y="558" width="50" height="36" fill="#1C1848" rx="3"/>
  <rect x="524" y="558" width="50" height="36" fill="#1C1848" rx="3"/>
  <rect x="584" y="558" width="50" height="36" fill="#1C1848" rx="3"/>
  <!-- Side towers -->
  <rect x="278" y="630" width="138" height="210" fill="#161436"/>
  <rect x="608" y="630" width="138" height="210" fill="#161436"/>
  <!-- Side battlements -->
  <rect x="268" y="610" width="40" height="32" fill="#161436" rx="3"/>
  <rect x="320" y="610" width="40" height="32" fill="#161436" rx="3"/>
  <rect x="372" y="610" width="40" height="32" fill="#161436" rx="3"/>
  <rect x="612" y="610" width="40" height="32" fill="#161436" rx="3"/>
  <rect x="664" y="610" width="40" height="32" fill="#161436" rx="3"/>
  <rect x="716" y="610" width="40" height="32" fill="#161436" rx="3"/>
  <!-- Gate arch -->
  <rect x="468" y="700" width="88" height="140" fill="#0A0820" rx="44"/>
  <!-- Glowing windows -->
  <ellipse cx="450" cy="650" rx="22" ry="28" fill="#FFD700" opacity="0.85"/>
  <ellipse cx="574" cy="650" rx="22" ry="28" fill="#FFD700" opacity="0.85"/>
  <ellipse cx="330" cy="680" rx="18" ry="22" fill="#FFD700" opacity="0.75"/>
  <ellipse cx="694" cy="680" rx="18" ry="22" fill="#FFD700" opacity="0.75"/>
  <!-- Window inner glow -->
  <ellipse cx="450" cy="650" rx="12" ry="16" fill="#FFF9C4" opacity="0.6"/>
  <ellipse cx="574" cy="650" rx="12" ry="16" fill="#FFF9C4" opacity="0.6"/>
  <!-- Ground line -->
  <rect x="230" y="840" width="564" height="14" fill="#2A1A4A" opacity="0.7" rx="5"/>

  <!-- Gold border ring -->
  <rect x="12" y="12" width="1000" height="1000" fill="none" stroke="#FFD700" stroke-width="8" stroke-opacity="0.30" rx="154"/>
</svg>`;

// ─── SPLASH SVG (2732×2732) ───────────────────────────────────────────────────
const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
  <defs>
    <radialGradient id="sbg" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#1E0A4A"/>
      <stop offset="100%" stop-color="#06041C"/>
    </radialGradient>
    <radialGradient id="sglow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFD700" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#FFD700" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="2732" height="2732" fill="url(#sbg)"/>
  <ellipse cx="1366" cy="1200" rx="700" ry="500" fill="url(#sglow)"/>

  <!-- Scaled crown centred at 1366, 1100 — scale=2.4 from icon -->
  <g transform="translate(771, 580) scale(1.16)">
    <rect x="248" y="480" width="528" height="100" fill="#B8860B" rx="8"/>
    <rect x="248" y="480" width="528" height="36"  fill="#FFD700" rx="8"/>
    <ellipse cx="340" cy="530" rx="22" ry="22" fill="#CC1133"/>
    <ellipse cx="340" cy="530" rx="14" ry="14" fill="#FF2244"/>
    <ellipse cx="512" cy="530" rx="26" ry="26" fill="#CC1133"/>
    <ellipse cx="512" cy="530" rx="17" ry="17" fill="#FF3355"/>
    <ellipse cx="684" cy="530" rx="22" ry="22" fill="#CC1133"/>
    <ellipse cx="684" cy="530" rx="14" ry="14" fill="#FF2244"/>
    <ellipse cx="426" cy="530" rx="16" ry="16" fill="#0044CC"/>
    <ellipse cx="598" cy="530" rx="16" ry="16" fill="#0044CC"/>
    <polygon points="248,480 296,310 344,480" fill="#FFD700"/>
    <polygon points="358,480 416,270 474,480" fill="#FFD700"/>
    <polygon points="464,480 512,220 560,480" fill="#FFD700"/>
    <polygon points="550,480 608,270 666,480" fill="#FFD700"/>
    <polygon points="680,480 728,310 776,480" fill="#FFD700"/>
    <circle cx="512" cy="218" r="20" fill="#FFD700"/>
    <circle cx="512" cy="218" r="11" fill="#FFFDE7"/>
    <rect x="400" y="580" width="224" height="220" fill="#1C1848"/>
    <rect x="468" y="700" width="88" height="100" fill="#0A0820" rx="44"/>
    <ellipse cx="450" cy="640" rx="22" ry="28" fill="#FFD700" opacity="0.85"/>
    <ellipse cx="574" cy="640" rx="22" ry="28" fill="#FFD700" opacity="0.85"/>
  </g>

  <!-- App name -->
  <text x="1366" y="1680"
    font-family="Arial Black, Arial" font-size="170" font-weight="900"
    fill="#FFD700" text-anchor="middle"
    style="letter-spacing:6px">ADAM'S KINGDOM</text>

  <!-- Tagline -->
  <text x="1366" y="1780"
    font-family="Arial" font-size="80" font-weight="400"
    fill="#8888BB" text-anchor="middle">Build. Spin. Conquer.</text>
</svg>`;

async function run() {
  console.log('Generating icon.png (1024×1024)…');
  await sharp(Buffer.from(iconSvg))
    .resize(1024, 1024)
    .png()
    .toFile('resources/icon.png');

  console.log('Generating splash.png (2732×2732)…');
  await sharp(Buffer.from(splashSvg))
    .resize(2732, 2732)
    .png()
    .toFile('resources/splash.png');

  console.log('Done → resources/icon.png + resources/splash.png');
}

run().catch(err => { console.error(err); process.exit(1); });
