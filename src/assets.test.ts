import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAME_IMAGE_FILES } from './lib/gameImageAssets';

describe('visual asset hygiene', () => {
  it('keeps every generated game PNG declared in the preload manifest', () => {
    const gameAssetDir = resolve(process.cwd(), 'public/game-assets');
    const pngFiles = readdirSync(gameAssetDir)
      .filter((fileName) => fileName.endsWith('.png'))
      .sort();

    expect(pngFiles).toEqual([...GAME_IMAGE_FILES].sort());
  });

  it('does not ship unused legacy SVG mole component files', () => {
    const componentAssetDir = resolve(process.cwd(), 'src/components/assets');
    const componentFiles = readdirSync(componentAssetDir)
      .filter((fileName) => fileName.endsWith('.tsx'))
      .sort();

    expect(componentFiles).toEqual([
      'GrassTuft.tsx',
      'MoleSprite.tsx',
      'StarEmpty.tsx',
      'StarFilled.tsx',
    ]);
  });

  it('uses a distinct padded maskable icon for safer mobile cropping', () => {
    const iconPath = resolve(process.cwd(), 'public/pwa-icon-512.png');
    const maskablePath = resolve(process.cwd(), 'public/pwa-maskable-512.png');

    expect(statSync(maskablePath).size).not.toBe(statSync(iconPath).size);
  });
});
