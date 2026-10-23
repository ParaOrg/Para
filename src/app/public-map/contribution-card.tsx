import { ButtonLink } from '@/design-system/primitives/button-link';
import {
  BLOB_PLACE,
  BUTTON_FILL,
  CARD_BLOB,
  CARD_SHADOW,
  CARD_SURFACE,
  CARD_TEXT,
} from '@/features/routes/cards/livery-card';
import type { Livery } from '@/features/routes/model/liveries';
import { ArrowRightIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

interface ContributionCardProps {
  /** The livery of the route card above it: this card wears the same surface, glow and words. */
  livery: Livery;
}

/**
 * Figma's ContributionCTA (4343:13485): the invitation at the end of the route list, in the colours
 * of the last route card. It is only a link; the contributor page is another address with its own
 * bundle, so the public page carries none of its code (scripts/checks/check-build.mjs).
 */
export function ContributionCard({ livery }: ContributionCardProps) {
  return (
    <div
      data-testid="contribution-card"
      data-livery={livery}
      className={cn(
        'relative isolate flex w-full flex-col items-center gap-2 overflow-clip px-4 pt-6 pb-8 font-sn-pro',
        CARD_SURFACE[livery],
        CARD_TEXT[livery],
      )}
    >
      <img
        src={CARD_BLOB[livery].src}
        alt=""
        aria-hidden
        className={cn(BLOB_PLACE, CARD_BLOB[livery].className)}
      />
      <p className="text-center text-lg/7 font-bold">Want to contribute a missing route?</p>
      <ButtonLink
        data-testid="contribution-link"
        href="/contribute/"
        variant="primary"
        size="small"
        fill={BUTTON_FILL[livery]}
        label="Contribute"
        lastIcon={<ArrowRightIcon />}
      />
      <span
        aria-hidden
        className={cn('pointer-events-none absolute inset-0', CARD_SHADOW[livery])}
      />
    </div>
  );
}
