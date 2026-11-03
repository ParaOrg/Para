import { useEffect, useRef, type ReactNode } from 'react';

import { Button } from '@/design-system/primitives/button';
import { IconButton } from '@/design-system/primitives/icon-button';

import { CloseIcon } from './route-icons';

/** Info hides itself; a problem stays until it is closed. */
export type ToastKind = 'info' | 'problem';

/** A small button on a problem toast's right, and what it does; the toast closes after it. */
export interface ToastAction {
  label: string;
  onAction: () => void;
}

interface ToastWords {
  /** A 24 px drawing in currentColor: location, warning, info. A problem colours it, never the card. */
  icon: ReactNode;
  /** One line, bold: what happened. */
  title: string;
  /** One more line, in Content/secondary: what to do about it. */
  body?: string;
}

/** The full card, or a pill that hugs an icon and a one-line title. */
export type ToastSize = 'regular' | 'compact';

/**
 * What a toast says. Only a problem, which stays until it is closed, may carry an action: a button
 * on a toast that hides itself would be gone before some people could reach it (WCAG's timing).
 * Only info may be compact, and then with a title alone: no line under it, no action, no ✕.
 */
export type ToastContent = ToastWords &
  (
    | { kind: 'info'; size?: 'regular'; action?: never }
    | { kind: 'info'; size: 'compact'; body?: never; action?: never }
    | { kind: 'problem'; size?: 'regular'; action?: ToastAction }
  );

export type ToastProps = ToastContent & {
  /** ✕, and how the host takes it away. */
  onClose: () => void;
  /** Set to slide it out; `onLeft` follows once the slide has finished. */
  isLeaving?: boolean;
  onLeft?: () => void;
};

const ICON_TONE = {
  info: 'text-content-primary',
  problem: 'text-content-error',
} satisfies Record<ToastKind, string>;

/**
 * A floating card at the top of the screen, 12 in from each side under the safe area: an icon, a
 * one-line title, an optional line under it and an optional action, then ✕. Compact, it is a pill
 * centred at the same top that hugs its icon and title, with no ✕: it goes by itself, as info does. It slides down from
 * the top as it arrives (`starting:`, ease/enter over duration/gentle) and back up as it leaves
 * (ease/exit over duration/quick); with reduced motion it just appears and goes. It never takes
 * focus. Who says it, and for how long, is the host's (ToastHost).
 *
 * A page that builds its own Tailwind with source(none) must @source this file and toast-host.tsx: its
 * classes are not seen otherwise (contribute.css does).
 */
export function Toast({
  kind,
  size = 'regular',
  icon,
  title,
  body,
  action,
  onClose,
  isLeaving = false,
  onLeft,
}: ToastProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Syncs with the browser's animations: once the slide out has finished (or was cancelled, or
  // there is none, with reduced motion), the host may take the card away.
  useEffect(() => {
    const card = cardRef.current;
    if (!isLeaving || !card || !onLeft) return;
    let isCurrent = true;
    // The class change starts the transition when styles are next read: wait a frame for it.
    const frame = requestAnimationFrame(() => {
      void Promise.allSettled(card.getAnimations().map((animation) => animation.finished)).then(
        () => {
          if (isCurrent) onLeft();
        },
      );
    });
    return () => {
      isCurrent = false;
      cancelAnimationFrame(frame);
    };
  }, [isLeaving, onLeft]);

  // The action does its thing, then the toast goes: it has said what it had to.
  const handleAction = () => {
    action?.onAction();
    onClose();
  };

  const motion =
    'transition-[translate,opacity] motion-reduce:transition-none ' +
    (isLeaving
      ? '-translate-y-full opacity-0 duration-quick ease-exit'
      : 'translate-y-0 opacity-100 duration-gentle ease-enter starting:-translate-y-full starting:opacity-0');

  if (size === 'compact') {
    return (
      <div
        ref={cardRef}
        data-testid="toast"
        data-kind={kind}
        data-size="compact"
        data-leaving={isLeaving || undefined}
        className={
          'pointer-events-auto mx-auto flex w-fit max-w-full items-center gap-2 rounded-2xl bg-surface py-2 pr-4 pl-3 font-sn-pro shadow-sm ' +
          motion
        }
      >
        <span aria-hidden className={'size-6 shrink-0 *:size-full ' + ICON_TONE[kind]}>
          {icon}
        </span>
        <p className="min-w-0 truncate text-base/6 font-bold text-content-primary">{title}</p>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      data-testid="toast"
      data-kind={kind}
      data-leaving={isLeaving || undefined}
      className={
        'pointer-events-auto flex items-start gap-3 rounded-2xl bg-surface p-3 font-sn-pro shadow-sm ' +
        motion
      }
    >
      {/* The icon and the title's 24 px line sit centred on the 32 px buttons: 4 down. */}
      <span aria-hidden className={'mt-1 size-6 shrink-0 *:size-full ' + ICON_TONE[kind]}>
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
        <p className="truncate text-base/6 font-bold text-content-primary">{title}</p>
        {body && <p className="text-sm/5 text-content-secondary">{body}</p>}
      </div>
      {action && (
        <span className="shrink-0">
          <Button variant="secondary" size="small" label={action.label} onClick={handleAction} />
        </span>
      )}
      <span className="shrink-0">
        <IconButton
          icon={<CloseIcon />}
          label="Close"
          size="small"
          tooltip="top"
          onClick={onClose}
        />
      </span>
    </div>
  );
}
