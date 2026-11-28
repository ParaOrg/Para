import { useRef, type KeyboardEvent } from 'react';

import { cn } from '@/shared/utils/cn';

import { AddRouteMenu } from './add-route-menu';
import type { AddWay } from './add-way';
import type { DirectionTab } from './direction-tabs';
import { TAB, TAB_WORDS } from './tab-look';

interface RouteLineTabsProps {
  /** One per direction, the way there first (directionTabs). */
  tabs: readonly DirectionTab[];
  /** The direction shown: its tab is the selected one. */
  selectedId: string;
  /** The id of the panel the tabs show (the detail's body). */
  panelId: string;
  /** A drawn direction's tab picked: that direction shows. */
  onSelect: (directionId: string) => void;
  /** A way picked from "+ Add route" on an undrawn direction's tab. Absent: read-only. */
  onAddRoute?: (directionId: string, how: AddWay) => void;
}

/** A tab's id, from the panel's and its direction's: the panel is labelled by its selected tab. */
export const tabIdOf = (panelId: string, directionId: string): string =>
  `${panelId}-tab-${directionId}`;

/**
 * The route line detail's tabs (4905:28977): one per direction, named by its bound, Medium 14/20,
 * the selected one in Brand/surface over a 2px line of it, the rest Text/secondary, along a
 * hairline. An undrawn direction's tab offers "+ Add route" instead, for an editor (a menu: draw
 * it, or start from an OSM or old Para route), or reads "Not drawn yet". The arrow keys move
 * between the drawn ones, as a tab list's do.
 */
export function RouteLineTabs({
  tabs,
  selectedId,
  panelId,
  onSelect,
  onAddRoute,
}: RouteLineTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const drawn = tabs.filter((tab) => tab.isDrawn);
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (step === undefined || drawn.length < 2) return;
    event.preventDefault();
    const at = drawn.findIndex((tab) => tab.direction.id === selectedId);
    const next = drawn[(at + step + drawn.length) % drawn.length];
    onSelect(next.direction.id);
    listRef.current?.querySelector<HTMLElement>(`[data-direction="${next.direction.id}"]`)?.focus();
  };
  return (
    <div className="flex w-full items-center border-b-0-6 border-border-secondary px-2 pt-3 font-sn-pro">
      <div ref={listRef} role="tablist" aria-label="Directions" className="flex items-center">
        {drawn.map((tab) => {
          const isSelected = tab.direction.id === selectedId;
          return (
            <button
              key={tab.direction.id}
              type="button"
              role="tab"
              id={tabIdOf(panelId, tab.direction.id)}
              data-direction={tab.direction.id}
              aria-selected={isSelected}
              aria-controls={isSelected ? panelId : undefined}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelect(tab.direction.id)}
              onKeyDown={handleKeyDown}
              className={cn(TAB_WORDS, TAB[isSelected ? 'selected' : 'rest'])}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs
        .filter((tab) => !tab.isDrawn)
        .map((tab) =>
          onAddRoute ? (
            <AddRouteMenu
              key={tab.direction.id}
              onChoose={(how) => onAddRoute(tab.direction.id, how)}
            />
          ) : (
            <span key={tab.direction.id} className={cn(TAB_WORDS, TAB.rest)}>
              Not drawn yet
            </span>
          ),
        )}
    </div>
  );
}
