import { useEffect, useRef } from 'react';

import type { HotspotKind } from '../drawing/drawing-types';

/**
 * The studio's two ways to start, at the bottom right: + New Route, and +
 * New hotspot with its menu — a terminal or a hintuan. Disabled until the
 * map is there to draw on. The menu's open state belongs to the workshop, which
 * keeps it while these buttons are away (a drawing, the list).
 *
 * They hold the map's bottom-right corner, so they say how tall they stand
 * there as `--dock-foot` on the page's `[data-dock-host]`, from the map's foot
 * to + New Route's top, and the LocationAndMap pill stands above them. The
 * menu is left out: it opens over the pill for a moment, rather than moving it.
 */
export function NewButtons({
  ready,
  menu,
  setMenu,
  onNewRoute,
  onNewHotspot,
}: {
  ready: boolean;
  /** Whether the hotspot menu is open. */
  menu: boolean;
  setMenu: (open: boolean | ((open: boolean) => boolean)) => void;
  onNewRoute: () => void;
  onNewHotspot: (kind: HotspotKind) => void;
}) {
  const newRouteRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const button = newRouteRef.current;
    const host = button?.closest<HTMLElement>('[data-dock-host]');
    if (!button || !host) return;
    const measure = () => {
      const foot = host.getBoundingClientRect().bottom - button.getBoundingClientRect().top;
      host.style.setProperty('--dock-foot', `${foot}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => {
      observer.disconnect();
      host.style.removeProperty('--dock-foot');
    };
  }, []);

  return (
    <div className="absolute right-[calc(1.5rem+env(safe-area-inset-right))] bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-10 flex flex-col items-end gap-2">
      {menu && (
        <div
          role="menu"
          className="mb-1 overflow-hidden rounded-xl bg-white text-sm shadow-lg ring-1 ring-black/10"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(false);
              onNewHotspot('terminal');
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-neutral-50"
          >
            <span className="h-3 w-3 rounded-sm bg-sky-500" />
            <span>
              <span className="font-medium text-neutral-900">Terminal</span>
              <span className="block text-xs text-neutral-500">Where routes start and stage</span>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(false);
              onNewHotspot('hintuan');
            }}
            className="flex w-full items-center gap-2 border-t border-neutral-100 px-4 py-2.5 text-left hover:bg-neutral-50"
          >
            <span className="h-3 w-3 rounded-sm bg-orange-500" />
            <span>
              <span className="font-medium text-neutral-900">Hintuan</span>
              <span className="block text-xs text-neutral-500">Where people wait and board</span>
            </span>
          </button>
        </div>
      )}
      <button
        ref={newRouteRef}
        type="button"
        disabled={!ready}
        onClick={onNewRoute}
        title="Draw a route"
        className="rounded-full bg-white px-5 py-3 text-sm font-medium text-neutral-800 shadow-lg ring-1 ring-black/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        + New Route
      </button>
      <button
        type="button"
        disabled={!ready}
        onClick={() => setMenu((open) => !open)}
        aria-expanded={menu}
        title="Trace a terminal or hintuan"
        className="rounded-full bg-white px-5 py-3 text-sm font-medium text-neutral-800 shadow-lg ring-1 ring-black/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        + New hotspot
      </button>
    </div>
  );
}
