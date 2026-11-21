import type { ReactNode, Ref } from 'react';

import { cn } from '@/shared/utils/cn';

interface TimelineRowTapProps {
  /** The row tapped; omitted, the row is not a control, a stop in a list and nothing more. */
  onTap?: () => void;
  /** Whether the row is picked, for its button's pressed state. */
  isSelected: boolean;
  /** A row's pressed look (STOP_PRESSED). */
  pressed: string;
  /** The row's own test id for its button, where the suites press it. */
  testId?: string;
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
}

/**
 * What holds a stop's row on a trip's timeline: a button where the page lets a ride be picked (the
 * studio's trip card), plain where it does not (the public map's, where picking is off).
 */
export function TimelineRowTap({
  onTap,
  isSelected,
  pressed,
  testId,
  ref,
  children,
}: TimelineRowTapProps) {
  if (!onTap) return <div className="flex w-full">{children}</div>;
  return (
    <button
      type="button"
      ref={ref}
      data-testid={testId}
      aria-pressed={isSelected}
      onClick={onTap}
      className={cn('flex w-full text-left', pressed)}
    >
      {children}
    </button>
  );
}
