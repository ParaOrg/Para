import type { ReactNode } from 'react';

interface ToastProps {
  children: ReactNode;
  onDismiss: () => void;
}

/**
 * The studio's one toast, over the bottom of the map — at the top on a
 * phone, where the New buttons and the drawing's bars fill the foot of the
 * screen, as wide as the screen and wrapping. One slot — the workshop shows
 * one toast at a time, the newest (Workshop, through SaveToasts), so toasts
 * never stack in one place without clearing each other. It is announced as
 * an alert.
 */
export function Toast({ children, onDismiss }: ToastProps) {
  return (
    <div
      role="alert"
      data-testid="toast"
      className={
        'absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full bg-red-600 px-4 py-2 text-sm text-white shadow-lg ' +
        'max-sm:inset-x-4 max-sm:top-[calc(4rem+var(--map-safe-top))] max-sm:bottom-auto max-sm:translate-x-0 max-sm:flex-wrap max-sm:rounded-2xl max-sm:py-3'
      }
    >
      <span className="max-sm:min-w-0 max-sm:flex-1">{children}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
