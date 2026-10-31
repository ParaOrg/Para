import type { ComponentType } from 'react';

import { ReloadIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import type { CardStatus, CardStatusTone } from './card-status';
import { CheckIcon } from './history-icons';

interface CardStatusLineProps {
  status: CardStatus;
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

const TONE_ICONS: Partial<Record<CardStatusTone, ComponentType>> = {
  uploaded: CheckIcon,
  retry: ReloadIcon,
};

/**
 * A card's upload status (Figma 4518:24536): an icon where Figma draws one and the words, so the
 * state never rests on colour alone. A failure's whole line is the retry button. The words are
 * announced as they change.
 */
export function CardStatusLine({ status, fullName, onRetry }: CardStatusLineProps) {
  const Icon = TONE_ICONS[status.tone];
  const content = (
    <>
      {Icon && (
        <span aria-hidden className="size-4 shrink-0 *:size-full">
          <Icon />
        </span>
      )}
      <span className="min-w-0 flex-1 text-left">{status.words}</span>
    </>
  );
  const line = 'flex min-w-0 flex-1 items-center gap-2 text-xs/4';
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
