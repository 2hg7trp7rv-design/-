import type { MoleType } from '../../store/gameStore';
import { getMoleAccessibleName, getMoleImageSrc } from '../../lib/gameImageAssets';

interface MoleSpriteProps {
  type: MoleType;
  hit?: boolean;
  className?: string;
  decorative?: boolean;
}

export default function MoleSprite({
  type,
  hit = false,
  className,
  decorative = true,
}: MoleSpriteProps) {
  const accessibleName = hit
    ? `hit reaction ${getMoleAccessibleName(type)}`
    : getMoleAccessibleName(type);

  return (
    <img
      src={getMoleImageSrc(type, hit)}
      alt={decorative ? '' : accessibleName}
      aria-hidden={decorative}
      className={className}
      draggable={false}
      decoding="async"
      loading="eager"
    />
  );
}
