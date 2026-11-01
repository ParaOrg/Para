import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Toast } from './toast';
import { INFO_TOAST_MS, ToastContext, type ToastMessage } from './toast-queue';

interface QueuedToast {
  message: ToastMessage;
  /** What makes two asks the same toast. */
  id: string;
  /** Unique to each ask that reached the queue: the card's key. */
  seq: number;
  /** Raised when the same toast is asked again while it shows, to start an info's clock again. */
  asked: number;
  /** On its way out: ✕, its action, its clock or hideToast. Only the first in the queue leaves. */
  isLeaving: boolean;
}

interface ToastHostProps {
  children: ReactNode;
}

const idOf = (message: ToastMessage): string => message.id ?? `${message.kind}:${message.title}`;

/**
 * Gives its children useToast and shows what they say, one toast at a time, in the order asked;
 * the same toast asked again while it shows or waits is said once, and hideToast takes one back. An info toast goes by itself
 * after INFO_TOAST_MS, its clock held while a pointer is over it or focus is in it; a problem stays
 * until ✕ or its action. Screen readers hear only the words, from two regions that are always
 * there: info politely (role=status), a problem at once (role=alert). The card, with its buttons,
 * sits outside them, so the buttons are not read out with the message.
 *
 * The card sits 12 under the safe area. A page whose own top row it would cover sets
 * `--toast-top` on an ancestor (its row's height plus 12, from spacing tokens), and the card sits
 * there instead.
 *
 * A page that builds its own Tailwind with source(none) must @source this file and toast.tsx: its
 * classes are not seen otherwise (contribute.css does).
 */
export function ToastHost({ children }: ToastHostProps) {
  const [queue, setQueue] = useState<QueuedToast[]>([]);
  const [isPointerOver, setIsPointerOver] = useState(false);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);
  const nextSeq = useRef(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Where focus was before it came into the toast, to go back to when the toast goes.
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const current = queue.at(0);

  const showToast = useCallback((message: ToastMessage) => {
    const id = idOf(message);
    setQueue((waiting) => {
      const [showing, ...rest] = waiting;
      if (showing?.id === id && !showing.isLeaving) {
        return [{ ...showing, message, asked: showing.asked + 1 }, ...rest];
      }
      if (waiting.some((toast, index) => index > 0 && toast.id === id)) return waiting;
      nextSeq.current += 1;
      return [...waiting, { message, id, seq: nextSeq.current, asked: 0, isLeaving: false }];
    });
  }, []);

  // The showing toast sets off; the next follows once it has slid out (handleLeft). Stable: the
  // info clock's effect depends on it.
  const leave = useCallback(() => {
    setQueue(([showing, ...rest]) => (showing ? [{ ...showing, isLeaving: true }, ...rest] : []));
  }, []);
  const hideToast = useCallback((id: string) => {
    setQueue(([showing, ...rest]) => {
      if (!showing) return [];
      const waiting = rest.filter((toast) => toast.id !== id);
      return [showing.id === id ? { ...showing, isLeaving: true } : showing, ...waiting];
    });
  }, []);
  const context = useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);
  // Stable: Toast waits on its slide out in an effect that depends on it.
  const handleLeft = useCallback(() => {
    // Its buttons are about to go: a keyboard's place goes back where it came from, not to <body>.
    if (wrapperRef.current?.contains(document.activeElement)) {
      const back = returnFocusTo.current;
      if (back?.isConnected) back.focus();
      else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    }
    returnFocusTo.current = null;
    setQueue((waiting) => waiting.slice(1));
  }, []);

  const currentSeq = current?.seq;
  // Syncs with the DOM: a new toast under a pointer that has not moved gets no pointerenter, so
  // whether it is pointed at, or holds focus, is read from the page as it arrives.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (currentSeq === undefined || !wrapper) return;
    setIsPointerOver(wrapper.matches(':hover'));
    setHasFocusWithin(wrapper.contains(document.activeElement));
  }, [currentSeq]);

  const isInfo = current?.message.kind === 'info';
  const isLeaving = current?.isLeaving ?? false;
  const isHeld = isPointerOver || hasFocusWithin;
  const asked = current?.asked;
  // An info toast's clock, run outside React: held while it is pointed at or focused, and started
  // again when the same toast is asked again (`asked`).
  useEffect(() => {
    if (currentSeq === undefined || !isInfo || isHeld || isLeaving) return;
    const timer = window.setTimeout(leave, INFO_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [currentSeq, asked, isInfo, isHeld, isLeaving, leave]);

  const message = current?.message;
  const words = message ? [message.title, message.body].filter(Boolean).join('. ') : '';
  return (
    <ToastContext value={context}>
      {children}
      <div className="sr-only">
        <div role="status">{message?.kind === 'info' && words}</div>
        <div role="alert">{message?.kind === 'problem' && words}</div>
      </div>
      <div className="pointer-events-none fixed inset-x-3 top-[var(--toast-top,calc(env(safe-area-inset-top)+0.75rem))] z-50">
        {current && message && (
          <div
            ref={wrapperRef}
            onPointerEnter={() => setIsPointerOver(true)}
            onPointerLeave={() => setIsPointerOver(false)}
            onFocus={(event) => {
              if (
                !event.currentTarget.contains(event.relatedTarget) &&
                event.relatedTarget instanceof HTMLElement
              ) {
                returnFocusTo.current = event.relatedTarget;
              }
              setHasFocusWithin(true);
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setHasFocusWithin(false);
            }}
          >
            <Toast
              key={current.seq}
              {...message}
              onClose={leave}
              isLeaving={isLeaving}
              onLeft={handleLeft}
            />
          </div>
        )}
      </div>
    </ToastContext>
  );
}
