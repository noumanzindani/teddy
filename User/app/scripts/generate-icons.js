/* Generate TEDDY app icon + splash from SVG using sharp. */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');

// Sage 600 background, gold logo
const SAGE = '#7E8A6E';
const GOLD = '#E0C58A';
const CREAM = '#F5F4EC';

function teddyLogoSvg(textColor, archColor, scale = 1) {
  // Centered TEDDY wordmark + arc
  const fontSize = 80 * scale;
  return `
    <text x="50%" y="50%" font-family="Georgia, serif" font-size="${fontSize}" font-weight="300"
          fill="${textColor}" text-anchor="middle" dominant-baseline="middle" letter-spacing="6">TEDDY</text>
    <path d="M ${100 * scale} ${75 * scale} Q ${256 * scale} ${145 * scale} ${412 * scale} ${75 * scale}"
          stroke="${archColor}" stroke-width="${5 * scale}" fill="none" stroke-linecap="round" />
  `;
}

function iconSvg(size) {
  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="${SAGE}" />
      <text x="50%" y="50%" font-family="Georgia, serif" font-size="${size * 0.34}" font-weight="300"
            fill="#FFFFFF" text-anchor="middle" dominant-baseline="central" letter-spacing="${size * 0.01}">T</text>
      <path d="M ${size * 0.22} ${size * 0.62} Q ${size / 2} ${size * 0.78} ${size * 0.78} ${size * 0.62}"
            stroke="${GOLD}" stroke-width="${size * 0.025}" fill="none" stroke-linecap="round" />
    </svg>
  `;
}

function splashSvg(width, height) {
  // Cream background with centered TEDDY logo
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${SAGE}" />
      <g transform="translate(${width / 2 - 256}, ${height / 2 - 50})">
        <text x="256" y="60" font-family="Georgia, serif" font-size="100" font-weight="300"
              fill="#FFFFFF" text-anchor="middle" dominant-baseline="central" letter-spacing="8">TEDDY</text>
        <path d="M 130 105 Q 256 150 382 105"
              stroke="${GOLD}" stroke-width="5" fill="none" stroke-linecap="round" />
        <text x="256" y="155" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="400"
              fill="#FFFFFF" text-anchor="middle" letter-spacing="6">WELLNESS SCHEDULING</text>
      </g>
    </svg>
  `;
}

async function gen(name, svg) {
  const out = path.join(ASSETS, name);
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log('Wrote', out);
}

async function main() {
  // App icon — 1024x1024 (Expo requirement)
  await gen('icon.png', iconSvg(1024));

  // Adaptive icon foreground (Android)
  await gen('adaptive-icon.png', iconSvg(1024));

  // Splash — 1284x2778 (iPhone Pro Max 6.7")
  await gen('splash-icon.png', splashSvg(1284, 2778));

  // Favicon for web
  await gen('favicon.png', iconSvg(48));

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
