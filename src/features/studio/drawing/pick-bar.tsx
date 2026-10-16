import { keepOptions, type ExtendEnds } from './toolbar-text';
import type { Drawing } from './use-drawing';

interface PickBarProps {
  draw: Drawing;
  /** The direction being extended, for the keep buttons' words (keepOptions). */
  ends: ExtendEnds | null;
}

/**
 * Extend, before anything is drawn: tap where the new route leaves the line,
 * then keep the part before that spot or the part after it.
 */
export function PickBar({ draw, ends }: PickBarProps) {
  const spot = draw.picking?.spot;
  const options = keepOptions(ends);

  return (
    <div className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-10 w-max max-w-[calc(100%-2rem)] -translate-x-1/2">
      <p className="mb-2 text-center text-[11px] text-neutral-600 [text-shadow:0_1px_2px_white]">
        {spot
          ? `${(spot.metres / 1000).toFixed(2)} km along the line · tap again to move the spot`
          : 'Tap the blue line where the new route leaves it'}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1 rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-black/10">
        {spot ? (
          options.map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => draw.keep(o.part)}
              data-testid={`keep-${o.part}`}
              className="rounded-xl px-3 py-1.5 text-left text-sm text-neutral-800 hover:bg-neutral-100"
            >
              <span className="font-medium">{o.label}</span>
              <span className="block text-[11px] text-neutral-500">{o.hint}</span>
            </button>
          ))
        ) : (
          <span className="px-3 text-xs text-neutral-500">Extend a route</span>
        )}
        <button
          type="button"
          onClick={draw.cancel}
          title="Stop extending"
          className="rounded-full px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
