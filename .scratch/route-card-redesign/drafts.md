# Step 5 drafts

Untested drafts of the filter and the Controller, written before this session handed over. Copy them in, then check them against `.claude/CLAUDE.md`, write their stories and run the ds-reviewer. The three icons they import from `@/shared/ui/route-icons` (`CloseLargeIcon`, `ArrowLeftRightIcon`, `FilterIcon`) do not exist yet: export them from Figma (README, step 5).

## `mode-filter.ts`

```ts
import { liveryOf, type Livery } from './liveries';
import type { Direction } from './routes';

/**
 * What the route list's filter can narrow it to (the owner's options, 2026-11-06): every route, or
 * one kind of ride. LRT is both light-rail lines, MRT the metro.
 */
export const MODE_FILTERS = ['all', 'jeep', 'ejeep', 'bus', 'lrt', 'mrt', 'ferry'] as const;
export type ModeFilter = (typeof MODE_FILTERS)[number];

/** Each option as the filter writes it. */
export const MODE_FILTER_LABEL = {
  all: 'All',
  jeep: 'Jeep',
  ejeep: 'E-Jeep',
  bus: 'Bus',
  lrt: 'LRT',
  mrt: 'MRT',
  ferry: 'Ferry',
} satisfies Record<ModeFilter, string>;

/** The card colours each option keeps; a route's colour is its mode's (liveryOf). */
const KEPT_LIVERIES = {
  jeep: ['jeep'],
  ejeep: ['ejeep'],
  bus: ['bus'],
  lrt: ['light-rail-way-one', 'light-rail-way-two'],
  mrt: ['metro-rail-way-three'],
  ferry: ['ferry'],
} satisfies Record<Exclude<ModeFilter, 'all'>, readonly Livery[]>;

/** Whether a direction stays listed under a filter. */
export function passesModeFilter(direction: Direction, filter: ModeFilter): boolean {
  if (filter === 'all') return true;
  const kept: readonly Livery[] = KEPT_LIVERIES[filter];
  return kept.includes(liveryOf(direction));
}
```

## `mode-filter-card.tsx`

```tsx
import { useId, type RefObject } from 'react';

import { MODE_FILTER_LABEL, MODE_FILTERS, type ModeFilter } from '../model/mode-filter';

interface ModeFilterCardProps {
  /** The card's own id, for the filter button's popoverTarget. */
  id: string;
  /** The card itself, so a choice can close it. */
  ref: RefObject<HTMLDivElement | null>;
  filter: ModeFilter;
  onFilter: (filter: ModeFilter) => void;
}

/**
 * The route list's filter (the sliders button), designed for now from the house's own parts until
 * the owner draws it: a card in the middle of the screen, as the Map Style card's surface and
 * shadow, with one choice of All, Jeep, E-Jeep, Bus, LRT, MRT or Ferry. Radio buttons, so the arrow
 * keys move through them and a screen reader says how many there are. A choice applies at once and
 * closes the card; Escape or a tap outside closes it as it was (the page's own popover).
 */
export function ModeFilterCard({ id, ref, filter, onFilter }: ModeFilterCardProps) {
  const titleId = useId();
  const handleChange = (next: ModeFilter) => {
    onFilter(next);
    ref.current?.hidePopover();
  };
  return (
    <div
      ref={ref}
      id={id}
      popover="auto"
      aria-labelledby={titleId}
      data-testid="mode-filter"
      className="m-auto w-72 rounded-2xl bg-surface p-4 font-sn-pro text-content-primary shadow-sm backdrop:bg-surface-transparent"
    >
      <fieldset className="flex flex-col gap-1">
        <legend id={titleId} className="mb-2 text-lg/7 font-extrabold">
          Show routes
        </legend>
        {MODE_FILTERS.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-base/6 font-medium has-checked:bg-surface-secondary has-focus-visible:outline-2 has-focus-visible:outline-brand-surface"
          >
            <input
              type="radio"
              name={titleId}
              value={option}
              checked={filter === option}
              onChange={() => handleChange(option)}
              className="size-4 accent-brand-surface outline-none"
            />
            {MODE_FILTER_LABEL[option]}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
```

## `route-list-controller.tsx`

```tsx
import { useId, useRef } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';
import { ArrowLeftRightIcon, CloseLargeIcon, FilterIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import { ModeFilterCard } from './mode-filter-card';
import { MODE_FILTER_LABEL, type ModeFilter } from '../model/mode-filter';

type RouteListControllerLayout = 'row' | 'column';

interface RouteListControllerProps {
  /**
   * Figma's Property 1: Default, a row along a phone sheet's foot, ✕ at the left and ⇆ over the
   * filter at the right; Variant2, a column beside the list docked on a wide screen, ✕ then ⇆ and
   * the filter.
   */
  layout: RouteListControllerLayout;
  /**
   * The way ⇆ leads to, switchWord's (Pabalik, Papunta, a train's other bound): its name, as the
   * word was on SWITCH. Null: no ⇆, for loops have no way back.
   */
  way: string | null;
  /** False when the other way round has nothing drawn; ⇆ then rests disabled. */
  switchable: boolean;
  /** Whether the way back is showing, for the suites (`data-back`). */
  back: boolean;
  onSwitch: () => void;
  filter: ModeFilter;
  onFilter: (filter: ModeFilter) => void;
  onClose: () => void;
}

const LAYOUT = {
  row: 'flex w-full items-end justify-between px-6 pb-8',
  column: 'flex w-22 flex-col items-center gap-2 px-5 pt-5 pb-8',
} satisfies Record<RouteListControllerLayout, string>;

/**
 * The route list's buttons (Controller, 4633:22010): ✕ closes the list, ⇆ shows every route the
 * other way round, and the sliders open the filter (ModeFilterCard). Each is the IconButton's
 * Special at Large, its drawing in Brand/surface. While a filter is on, a dot sits on the sliders
 * and its name says which.
 */
export function RouteListController({
  layout,
  way,
  switchable,
  back,
  onSwitch,
  filter,
  onFilter,
  onClose,
}: RouteListControllerProps) {
  const filterCardId = useId();
  const filterCardRef = useRef<HTMLDivElement>(null);
  const isFiltered = filter !== 'all';
  return (
    <div data-testid="chooser-controller" className={LAYOUT[layout]}>
      <IconButton
        size="large"
        icon={<BrandIcon icon={<CloseLargeIcon />} />}
        label="Close"
        tooltip={layout === 'row' ? 'bottom' : 'left'}
        onClick={onClose}
      />
      <div className="flex flex-col items-center gap-4">
        {way !== null && (
          <IconButton
            size="large"
            icon={<BrandIcon icon={<ArrowLeftRightIcon />} />}
            label={way}
            tooltip={layout === 'row' ? 'right' : 'left'}
            data-testid="chooser-flip"
            data-back={back}
            disabled={!switchable}
            onClick={onSwitch}
          />
        )}
        <span className="relative flex">
          <IconButton
            size="large"
            icon={<BrandIcon icon={<FilterIcon />} />}
            label={isFiltered ? `Filter: ${MODE_FILTER_LABEL[filter]}` : 'Filter'}
            tooltip={layout === 'row' ? 'right' : 'left'}
            data-testid="chooser-filter"
            popoverTarget={filterCardId}
          />
          {isFiltered && (
            <span
              aria-hidden
              className="pointer-events-none absolute top-0 right-0 size-3 rounded-full bg-brand-surface ring-2 ring-surface"
            />
          )}
        </span>
      </div>
      <ModeFilterCard id={filterCardId} ref={filterCardRef} filter={filter} onFilter={onFilter} />
    </div>
  );
}

/** A drawing in Brand/surface, as the Controller's are (Figma overrides the IconButton's words). */
function BrandIcon({ icon }: { icon: React.ReactNode }) {
  return <span className={cn('flex text-brand-surface *:size-7')}>{icon}</span>;
}
```

