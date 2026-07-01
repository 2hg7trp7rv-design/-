import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function readProjectFile(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf-8');
}

describe('PWA metadata and service worker', () => {
  it('keeps the install metadata aligned with the MoguMogu brand', () => {
    const manifest = JSON.parse(readProjectFile('../public/manifest.json')) as {
      name: string;
      short_name: string;
      icons: Array<{ src: string; purpose?: string }>;
    };

    expect(manifest.name).toBe('MoguMogu Smack!');
    expect(manifest.short_name).toBe('MoguMogu');
    expect(manifest.icons.some((icon) => icon.src === 'pwa-icon-192.png')).toBe(true);
    expect(manifest.icons.some((icon) => icon.src === 'pwa-icon-512.png')).toBe(true);
    expect(
      manifest.icons.some(
        (icon) => icon.src === 'pwa-maskable-512.png' && icon.purpose === 'maskable',
      ),
    ).toBe(true);
    expect(manifest.icons.some((icon) => icon.src === 'pwa-icon.svg')).toBe(true);
    expect(JSON.stringify(manifest)).not.toMatch(/Wani|Croc/i);
  });

  it('ships a service worker with a versioned cache', () => {
    const serviceWorker = readProjectFile('../public/sw.js');

    expect(serviceWorker).toContain('CACHE_NAME');
    expect(serviceWorker).toContain('mogumogu-smack');
    expect(serviceWorker).toContain("self.addEventListener('fetch'");
    expect(serviceWorker).toContain('SKIP_WAITING');
    expect(serviceWorker).toContain('/__/auth/');
    expect(serviceWorker).toContain("endsWith('.js')");
    expect(serviceWorker).toContain("endsWith('.css')");
  });

  it('serves production gameplay PNGs from the public game-assets path', () => {
    const serviceWorker = readProjectFile('../public/sw.js');
    const gameAssetFiles = [
      'mogumogu_transparent_01.png',
      'mogumogu_transparent_02.png',
      'mogumogu_transparent_03.png',
      'mogumogu_transparent_04.png',
      'mogumogu_transparent_05.png',
      'mogumogu_transparent_06.png',
      'mogumogu_transparent_07.png',
    ];

    gameAssetFiles.forEach((fileName) => {
      expect(existsSync(resolve(process.cwd(), 'public', 'game-assets', fileName))).toBe(true);
      expect(serviceWorker).toContain(`./game-assets/${fileName}`);
    });
  });
});

describe('offline-friendly document shell', () => {
  it('does not depend on remote Google Fonts during app startup', () => {
    const html = readProjectFile('../index.html');

    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toContain('fonts.gstatic.com');
    expect(html).toContain('apple-touch-icon.png');
  });
});
