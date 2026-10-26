import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';

/**
 * The New menu's keyboard and outside-click behaviour, the WAI-ARIA menu
 * button pattern: opening moves focus to the first choice, the arrows, Home
 * and End move between choices, Escape closes and hands focus back to the +,
 * Tab closes and lets focus move on, and a press anywhere else closes.
 */
export function useNewMenu(isOpen: boolean, onOpenChange: (isOpen: boolean) => void) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Focus is the DOM's, so moving it on opening is an effect's job.
  useEffect(() => {
    if (isOpen) menuItems(menuRef.current)[0]?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) {
        onOpenChange(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen, onOpenChange]);

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = menuItems(menuRef.current);
    const current = items.findIndex((item) => item === document.activeElement);
    const last = items.length - 1;
    const next: Partial<Record<string, number>> = {
      ArrowDown: current === last ? 0 : current + 1,
      ArrowUp: current <= 0 ? last : current - 1,
      Home: 0,
      End: last,
    };
    const target = next[event.key];
    if (target !== undefined) {
      event.preventDefault();
      items[target]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onOpenChange(false);
      triggerRef.current?.focus();
    } else if (event.key === 'Tab') {
      onOpenChange(false);
    }
  };

  return { rootRef, triggerRef, menuRef, handleMenuKeyDown };
}

function menuItems(menu: HTMLElement | null): HTMLElement[] {
  return menu ? Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]')) : [];
}
