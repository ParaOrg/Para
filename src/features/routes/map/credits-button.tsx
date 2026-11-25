import type { Ref } from 'react';

import { InformationIcon } from '@/shared/ui/route-icons';

/** 32 across (4494:2048), or 28 on the public map (4885:44809). */
export type CreditsButtonSize = 'md' | 'sm';

const SIZE = { md: 'size-8', sm: 'size-7' } satisfies Record<CreditsButtonSize, string>;

interface CreditsButtonProps {
  onClick: () => void;
  size?: CreditsButtonSize;
  /** For focus to come back to when the credits close. */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Figma's Information (4494:2048): the map's ⓘ, 32 across (28 on the public map's corner,
 * 4885:44809), in Content/primary at 40%. It opens the map's credits, the Map Data Source sheet.
 */
export function CreditsButton({ onClick, size = 'md', ref }: CreditsButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label="Map data sources"
      title="Map data sources"
      onClick={onClick}
      className={SIZE[size] + ' text-content-primary opacity-40 *:size-full'}
    >
      <InformationIcon />
    </button>
  );
}
