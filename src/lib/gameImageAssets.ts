import type { MoleType } from '../store/gameStore';

const assetBase = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/game-assets`;

export const GAME_IMAGE_FILES = [
  'mogumogu_transparent_01.png',
  'mogumogu_transparent_02.png',
  'mogumogu_transparent_03.png',
  'mogumogu_transparent_04.png',
  'mogumogu_transparent_05.png',
  'mogumogu_transparent_06.png',
  'mogumogu_transparent_07.png',
] as const;

type GameImageFile = (typeof GAME_IMAGE_FILES)[number];

function assetPath(fileName: GameImageFile): string {
  return `${assetBase}/${fileName}`;
}

export const GAME_IMAGE_ASSETS = {
  hole: assetPath('mogumogu_transparent_03.png'),
  moles: {
    normal: assetPath('mogumogu_transparent_05.png'),
    golden: assetPath('mogumogu_transparent_01.png'),
    angry: assetPath('mogumogu_transparent_04.png'),
  },
  hitMoles: {
    normal: assetPath('mogumogu_transparent_02.png'),
    golden: assetPath('mogumogu_transparent_06.png'),
    angry: assetPath('mogumogu_transparent_07.png'),
  },
} as const satisfies {
  hole: string;
  moles: Record<MoleType, string>;
  hitMoles: Record<MoleType, string>;
};

export const GAME_IMAGE_ASSET_LIST = [
  GAME_IMAGE_ASSETS.hole,
  GAME_IMAGE_ASSETS.moles.normal,
  GAME_IMAGE_ASSETS.moles.golden,
  GAME_IMAGE_ASSETS.moles.angry,
  GAME_IMAGE_ASSETS.hitMoles.normal,
  GAME_IMAGE_ASSETS.hitMoles.golden,
  GAME_IMAGE_ASSETS.hitMoles.angry,
] as const;

export function getMoleImageSrc(type: MoleType, isHit = false): string {
  return isHit ? GAME_IMAGE_ASSETS.hitMoles[type] : GAME_IMAGE_ASSETS.moles[type];
}

export function getMoleAccessibleName(type: MoleType): string {
  if (type === 'angry') return 'mischievous trap mole';
  if (type === 'golden') return 'golden bonus mole';
  return 'normal mole';
}
