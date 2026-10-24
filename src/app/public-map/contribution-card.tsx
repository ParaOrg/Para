import {
  BLOB_PLACE,
  CARD_BLOB,
  CARD_SHADOW,
  CARD_SURFACE,
} from '@/features/routes/cards/livery-card';
import type { Livery } from '@/features/routes/model/liveries';
import { cn } from '@/shared/utils/cn';

interface ContributionCardProps {
  /** The livery of the route card above it: this card wears the same surface and glow. */
  livery: Livery;
}

/**
 * Figma's ContributionCTA (4343:13485) without its words or link, for now: the card at the end of
 * the route list, in the colours of the last route card, growing down to fill what a short list
 * leaves of the sheet (the blob stays where it is), never shorter than its words and button once made it. It is decorative: hidden from assistive
 * technology and holding nothing to focus.
 */
export function ContributionCard({ livery }: ContributionCardProps) {
  return (
    <div
      aria-hidden
      data-testid="contribution-card"
      data-livery={livery}
      className={cn('relative isolate min-h-31 w-full grow overflow-clip', CARD_SURFACE[livery])}
    >
      <img
        src={CARD_BLOB[livery].src}
        alt=""
        aria-hidden
        className={cn(BLOB_PLACE, CARD_BLOB[livery].className)}
      />
      <span
        aria-hidden
        className={cn('pointer-events-none absolute inset-0', CARD_SHADOW[livery])}
      />
    </div>
  );
}
