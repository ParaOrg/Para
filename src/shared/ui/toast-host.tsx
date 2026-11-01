import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Toast } from './toast';
import { INFO_TOAST_MS, ToastContext, type ToastMessage } from './toast-queue';

interface QueuedToast extends ToastMessage {
  id: number;
}

interface ToastHostProps {
  children: ReactNode;
}

/**
 * Gives its children useToast and shows what they say, one toast at a time, in the order asked.
 * An info toast goes by itself after INFO_TOAST_MS, the clock starting again while a pointer is
 * over it or focus is in it; a problem stays until ✕ or its action. Info is spoken politely
 * (role=status), a problem at once (role=alert): both regions are always there, so a screen
 * reader hears what arrives in them.
 */
export function ToastHost({ children }: ToastHostProps) {
  const [queue, setQueue] = useState<QueuedToast[]>([]);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const nextId = useRef(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Where focus was before it came into the toast, to go back to when the toast goes.
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const current = queue.at(0);

  const showToast = useCallback((message: ToastMessage) => {
    nextId.current += 1;
    const id = nextId.current;
    setQueue((waiting) => [...waiting, { ...message, id }]);
  }, []);
  const context = useMemo(() => ({ showToast }), [showToast]);

  const handleClose = () => setIsLeaving(true);
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
    setIsLeaving(false);
    setIsHeld(false);
  }, []);

  const currentId = current?.id;
  const isInfo = current?.kind === 'info';
  // An info toast's clock, run outside React; held while it is pointed at or focused.
  useEffect(() => {
    if (currentId === undefined || !isInfo || isHeld || isLeaving) return;
    const timer = window.setTimeout(() => setIsLeaving(true), INFO_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [currentId, isInfo, isHeld, isLeaving]);

  const toast = current && (
    <div
      ref={wrapperRef}
      onPointerEnter={() => setIsHeld(true)}
      onPointerLeave={() => setIsHeld(false)}
      onFocus={(event) => {
        if (
          !event.currentTarget.contains(event.relatedTarget) &&
          event.relatedTarget instanceof HTMLElement
        ) {
          returnFocusTo.current = event.relatedTarget;
        }
        setIsHeld(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsHeld(false);
      }}
    >
      <Toast
        key={current.id}
        kind={current.kind}
        icon={current.icon}
        title={current.title}
        body={current.body}
        action={
          current.action && {
            label: current.action.label,
            onAction: () => {
              current.action?.onAction();
              setIsLeaving(true);
            },
          }
        }
        onClose={handleClose}
        isLeaving={isLeaving}
        onLeft={handleLeft}
      />
    </div>
  );

  return (
    <ToastContext value={context}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50">
        <div role="status">{current?.kind === 'info' && toast}</div>
        <div role="alert">{current?.kind === 'problem' && toast}</div>
      </div>
    </ToastContext>
  );
}
