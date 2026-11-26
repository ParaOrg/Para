import { useId, type ReactNode } from 'react';

import type { OtherRoute } from '@/features/routes/cards/trip-more-routes';
import type { TimelineRow } from '@/features/routes/model/timeline';

import type { DirectionTab } from './direction-tabs';
import { OtherDestinations } from './other-destinations';
import { RouteLineTabs, tabIdOf } from './route-line-tabs';
import { RouteSignboardsSection } from './route-signboards-section';
import { RouteStopsSection } from './route-stops-section';
import { TransitLineInfo, type TransitLineFact } from './transit-line-info';

interface RouteLineDetailProps {
  /** What the panel is, to a screen reader: the open direction's name. */
  label: string;
  /** Above the tabs: the draft notice, or another editor's locked draft. */
  notice?: ReactNode;
  /** One per direction (directionTabs); none for a loop, which has no tabs. */
  tabs: readonly DirectionTab[];
  /** The direction shown. */
  selectedId: string;
  onSelect: (directionId: string) => void;
  /** "+ Add route" on an undrawn direction's tab; absent where read-only. */
  onAddRoute?: (directionId: string) => void;
  /** Edit Route, Extend, Export and ⋮ (RouteLineActions). */
  actions: ReactNode;
  facts: readonly TransitLineFact[];
  destinations: readonly OtherRoute[];
  onOpenDestination: (id: string) => void;
  signboards: readonly string[];
  stops: readonly TimelineRow[];
  onStop: (id: string) => void;
}

/**
 * The studio's route line detail on a computer (4905:28656), in the left panel area, 384 across
 * and the full height: the tabs along its top, then its actions and its sections, 24 apart,
 * scrolling on their own: Transit line information, Other destinations, Signboard, Route Stops.
 */
export function RouteLineDetail({
  label,
  notice,
  tabs,
  selectedId,
  onSelect,
  onAddRoute,
  actions,
  facts,
  destinations,
  onOpenDestination,
  signboards,
  stops,
  onStop,
}: RouteLineDetailProps) {
  const panelId = useId();
  const hasTabs = tabs.length > 0;
  return (
    <section
      data-testid="route-line-detail"
      aria-label={label}
      className="flex h-full w-96 shrink-0 flex-col bg-surface font-sn-pro shadow-bottom-sheet-top-shadow"
    >
      {notice && <div className="shrink-0 px-4 pt-4 empty:hidden">{notice}</div>}
      {hasTabs && (
        <RouteLineTabs
          tabs={tabs}
          selectedId={selectedId}
          panelId={panelId}
          onSelect={onSelect}
          onAddRoute={onAddRoute}
        />
      )}
      <div
        id={panelId}
        role={hasTabs ? 'tabpanel' : undefined}
        aria-labelledby={hasTabs ? tabIdOf(panelId, selectedId) : undefined}
        className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pt-6 pb-4"
      >
        {actions}
        <TransitLineInfo facts={facts} />
        <OtherDestinations destinations={destinations} onOpen={onOpenDestination} />
        <RouteSignboardsSection signboards={signboards} />
        <RouteStopsSection stops={stops} onStop={onStop} />
      </div>
    </section>
  );
}
