import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Generate PWA icons for Tax Deed Flow
 * Creates icons in various sizes with proper branding
 */

const ICONS_DIR = path.join(process.cwd(), 'public', 'icons');

// Brand colors for Tax Deed Flow
const BRAND_COLORS = {
  primary: '#2563eb', // Blue
  secondary: '#1e40af', // Darker blue
  accent: '#3b82f6', // Light blue
};

interface IconConfig {
  name: string;
  size: number;
  purpose?: 'any' | 'maskable';
}

const ICON_CONFIGS: IconConfig[] = [
  { name: 'icon-192x192.png', size: 192, purpose: 'any' },
  { name: 'icon-512x512.png', size: 512, purpose: 'any' },
  { name: 'apple-touch-icon.png', size: 180, purpose: 'any' },
  { name: 'icon-maskable-192x192.png', size: 192, purpose: 'maskable' },
  { name: 'icon-maskable-512x512.png', size: 512, purpose: 'maskable' },
];

/**
 * Generate SVG icon with Tax Deed Flow branding
 */
function generateIconSVG(size: number, maskable: boolean = false): string {
  // For maskable icons, add extra padding (safe zone)
  const padding = maskable ? size * 0.2 : size * 0.1;
  const contentSize = size - padding * 2;
  const centerX = size / 2;
  const centerY = size / 2;

  // Calculate text size based on icon size
  const fontSize = contentSize * 0.35;
  const subtextSize = contentSize * 0.12;

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${BRAND_COLORS.primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${BRAND_COLORS.secondary};stop-opacity:1" />
        </linearGradient>
        <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:${BRAND_COLORS.accent};stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:${BRAND_COLORS.primary};stop-opacity:0.6" />
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="${size}" height="${size}" fill="url(#bgGradient)" />

      <!-- Decorative elements -->
      <circle cx="${centerX}" cy="${centerY * 0.4}" r="${contentSize * 0.15}" fill="url(#accentGradient)" opacity="0.3" />
      <circle cx="${centerX * 1.3}" cy="${centerY * 1.2}" r="${contentSize * 0.1}" fill="white" opacity="0.2" />

      <!-- Main text -->
      <text
        x="${centerX}"
        y="${centerY - subtextSize * 0.5}"
        font-family="Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="white"
        text-anchor="middle"
        dominant-baseline="middle"
      >TDF</text>

      <!-- Subtext -->
      <text
        x="${centerX}"
        y="${centerY + fontSize * 0.65}"
        font-family="Arial, sans-serif"
        font-size="${subtextSize}"
        font-weight="500"
        fill="white"
        text-anchor="middle"
        opacity="0.95"
      >TAX DEED FLOW</text>

      <!-- Decorative line -->
      <rect
        x="${centerX - contentSize * 0.3}"
        y="${centerY + fontSize * 0.85}"
        width="${contentSize * 0.6}"
        height="2"
        fill="white"
        opacity="0.6"
      />
    </svg>
  `;
}

/**
 * Ensure icons directory exists
 */
async function ensureIconsDirectory(): Promise<void> {
  try {
    await fs.mkdir(ICONS_DIR, { recursive: true });
    console.log(`✓ Created icons directory: ${ICONS_DIR}`);
  } catch (error) {
    console.error(`✗ Failed to create icons directory:`, error);
    throw error;
  }
}

/**
 * Generate a single icon
 */
async function generateIcon(config: IconConfig): Promise<void> {
  const { name, size, purpose } = config;
  const isMaskable = purpose === 'maskable';
  const outputPath = path.join(ICONS_DIR, name);

  try {
    const svgBuffer = Buffer.from(generateIconSVG(size, isMaskable));

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✓ Generated ${name} (${size}x${size}${isMaskable ? ', maskable' : ''})`);
  } catch (error) {
    console.error(`✗ Failed to generate ${name}:`, error);
    throw error;
  }
}

/**
 * Generate all PWA icons
 */
async function generateAllIcons(): Promise<void> {
  console.log('\n🎨 Generating PWA icons for Tax Deed Flow...\n');

  await ensureIconsDirectory();

  for (const config of ICON_CONFIGS) {
    await generateIcon(config);
  }

  console.log('\n✓ All PWA icons generated successfully!\n');
  console.log('Generated icons:');
  ICON_CONFIGS.forEach((config) => {
    console.log(`  - ${config.name} (${config.size}x${config.size})`);
  });
}

// Run the script
generateAllIcons().catch((error) => {
  console.error('\n✗ Icon generation failed:', error);
  process.exit(1);
});
