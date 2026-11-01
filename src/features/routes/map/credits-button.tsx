import type { Ref } from 'react';

import { InformationIcon } from '@/shared/ui/route-icons';

interface CreditsButtonProps {
  onClick: () => void;
  /** For focus to come back to when the credits close. */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Figma's Information (4494:2048): the map's ⓘ, 32 across, in Content/primary at 40%, at the
 * map's bottom left. It opens the map's credits, the Map Data Source sheet.
 */
export function CreditsButton({ onClick, ref }: CreditsButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label="Map data sources"
      title="Map data sources"
      onClick={onClick}
      className="size-8 text-content-primary opacity-40 *:size-full"
    >
      <InformationIcon />
    </button>
  );
}
