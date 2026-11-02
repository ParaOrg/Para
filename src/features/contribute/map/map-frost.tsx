import { cn } from '@/shared/utils/cn';

interface MapFrostProps {
  /** A recording is paused: the map behind frosts over. */
  isFrosted: boolean;
}

/**
 * The map frosted while a recording is paused, so the pause shows at a glance: a small blur
 * (backdrop-blur-frost) and a faint wash of the surface's white, the map still readable through
 * it. It frosts what is behind it only, so whatever is drawn over it stays crisp. It eases in on
 * gentle and out on quick; with reduced motion it simply appears. Clear, it is invisible: not
 * painted, so no blur is worked out.
 */
export function MapFrost({ isFrosted }: MapFrostProps) {
  return (
    <div
      aria-hidden
      data-map-frost={isFrosted || undefined}
      className={cn(
        'pointer-events-none absolute inset-0 bg-surface/25 backdrop-blur-frost',
        'transition-[opacity,visibility] motion-reduce:transition-none',
        isFrosted
          ? 'visible opacity-100 duration-gentle ease-enter'
          : 'invisible opacity-0 duration-quick ease-exit',
      )}
    />
  );
}
