import type { ComponentType } from 'react';

import { ReloadIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import type { CardStatus, CardStatusTone } from './card-status';
import { CheckIcon } from '../common/history-icons';

/** The card's own line, or the ride sheet's larger one (Figma 4569:4974). */
type CardStatusLineSize = 'card' | 'sheet';

interface CardStatusLineProps {
  status: CardStatus;
  size?: CardStatusLineSize;
  /** The card's recording in words, so the retry button says which one it sends. */
  fullName: string;
  onRetry: () => void;
}

const TONE_CLASSES: Record<CardStatusTone, string> = {
  uploaded: 'text-content-success',
  retry: 'text-card-orange-surface',
  quiet: 'text-content-quaternary',
  problem: 'text-content-error',
};

const LINE_CLASSES: Record<CardStatusLineSize, string> = {
  card: 'gap-2 text-xs/4',
  sheet: 'gap-1.5 text-sm/5',
};

const ICON_CLASSES: Record<CardStatusLineSize, string> = {
  card: 'size-4',
  sheet: 'size-4',
};

const TONE_ICONS: Partial<Record<CardStatusTone, ComponentType>> = {
  uploaded: CheckIcon,
  retry: ReloadIcon,
};

/**
 * A card's upload status (Figma 4518:24536): an icon where Figma draws one and the words, so the
 * state never rests on colour alone. A failure's whole line is the retry button. The words are
 * announced as they change.
 */
export function CardStatusLine({ status, size = 'card', fullName, onRetry }: CardStatusLineProps) {
  const Icon = TONE_ICONS[status.tone];
  const content = (
    <>
      {Icon && (
        <span aria-hidden className={cn(ICON_CLASSES[size], 'shrink-0 *:size-full')}>
          <Icon />
        </span>
      )}
      <span className="min-w-0 flex-1 text-left">{status.words}</span>
    </>
  );
  const line = cn('flex min-w-0 flex-1 items-center', LINE_CLASSES[size]);
  return (
    <div aria-live="polite" className="flex min-w-0 flex-1">
      {status.tone === 'retry' ? (
        <button
          type="button"
          aria-label={`${status.words}, ${fullName}`}
          onClick={onRetry}
          className={cn(line, TONE_CLASSES[status.tone])}
        >
          {content}
        </button>
      ) : (
        <p className={cn(line, TONE_CLASSES[status.tone])}>{content}</p>
      )}
    </div>
  );
}
