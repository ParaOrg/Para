import type { ComponentProps } from 'react';

import { MapSwitch } from '@/features/studio';

type StudioTopBarProps = ComponentProps<typeof MapSwitch>;

/**
 * The studio's top bar with its map switch, over the map only: on a computer the left panel area
 * runs the full height beside it. Everything on the map starts below it. Provisional until the
 * owner's Figma frame.
 */
export function StudioTopBar(props: StudioTopBarProps) {
  return (
    <div
      data-testid="studio-top-bar"
      className="relative flex h-[calc(3rem+env(safe-area-inset-top))] shrink-0 items-center justify-center border-b border-border-primary bg-surface px-4 pt-[env(safe-area-inset-top)]"
    >
      <MapSwitch {...props} />
    </div>
  );
}
