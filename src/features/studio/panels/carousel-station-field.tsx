import { CAROUSEL_LINE } from '@/features/routes/model/busway';

interface CarouselStationFieldProps {
  /** The hintuan's station line: null for a jeep hintuan. */
  line: string | null;
  onChange: (line: string | null) => void;
}

/**
 * Whether a hintuan is an EDSA Carousel station: the one line that stops at it is the
 * Carousel's, and a road route still does where its line passes it (servedBy). A train's or the ferry's station comes in by its import with its line fixed, so it
 * shows none.
 */
export function CarouselStationField({ line, onChange }: CarouselStationFieldProps) {
  if (line !== null && line !== CAROUSEL_LINE) return null;
  return (
    <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
      <input
        type="checkbox"
        checked={line === CAROUSEL_LINE}
        onChange={(e) => onChange(e.target.checked ? CAROUSEL_LINE : null)}
        className="h-4 w-4 accent-neutral-900"
      />
      <span>
        EDSA Carousel station{' '}
        <span className="text-neutral-400">— only the Carousel stops here</span>
      </span>
    </label>
  );
}
