import { cn } from '@/shared/utils/cn';

import { frostRings, type FrostCentre } from './frost-rings';

interface MapFrostProps {
  /** A recording is paused: the map behind frosts over. */
  isFrosted: boolean;
  /** Where it clears: round the rider's dot (useFrostCentre). */
  centre: FrostCentre;
}

/** A mask clear inside `fromPx` of the centre and whole from `toPx` out. */
function ringMask(centre: FrostCentre, fromPx: number, toPx: number): string {
  return `radial-gradient(circle at ${centre.x}px ${centre.y}px, transparent ${fromPx}px, black ${toPx}px)`;
}

/**
 * The map frosted while a recording is paused, so the pause shows at a glance: clear round the
 * rider's dot and blurrier step by step out to the edges (frost-rings.ts), with a faint wash of
 * the surface's white where it is blurred, so the dot's own street keeps its colours. It frosts
 * what is behind it only, so whatever is drawn over it stays crisp. It comes and goes at once, in
 * the frame the pause or the resume is drawn: no fade, which would blur the whole map again on
 * every frame of it. Clear, it is invisible: not painted, so no blur is worked out.
 */
export function MapFrost({ isFrosted, centre }: MapFrostProps) {
  const rings = centre.width > 0 ? frostRings(centre) : [];
  const outer = rings[rings.length - 1];
  const wash = outer ? ringMask(centre, centre.clearPx, outer.toPx) : undefined;
  return (
    <div
      aria-hidden
      data-map-frost={isFrosted || undefined}
      data-frost-x={Math.round(centre.x)}
      data-frost-y={Math.round(centre.y)}
      data-frost-clear={Math.round(centre.clearPx)}
      className={cn('pointer-events-none absolute inset-0', isFrosted ? 'visible' : 'invisible')}
    >
      {rings.map((ring) => {
        const mask = ringMask(centre, ring.fromPx, ring.toPx);
        const blur = `blur(${ring.blurPx}px)`;
        return (
          <div
            key={ring.levelPx}
            data-frost-ring={ring.blurPx.toFixed(2)}
            className="absolute inset-0"
            style={{
              backdropFilter: blur,
              WebkitBackdropFilter: blur,
              maskImage: mask,
              WebkitMaskImage: mask,
            }}
          />
        );
      })}
      {wash && (
        <div
          data-frost-wash
          className="absolute inset-0 bg-surface/25"
          style={{ maskImage: wash, WebkitMaskImage: wash }}
        />
      )}
    </div>
  );
}
