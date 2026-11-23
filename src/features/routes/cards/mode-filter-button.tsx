import { useId, useRef, type ReactNode } from 'react';

import { IconButton, type TooltipPosition } from '@/design-system/primitives/icon-button';

import { ModeFilterCard } from './mode-filter-card';
import { MODE_FILTER_LABEL, type ModeFilterControl } from '../model/mode-filter';

interface ModeFilterButtonProps {
  /** The filter, kept by the caller, who lights the map to match. */
  modeFilter: ModeFilterControl;
  /** The sliders' drawing: the Controller's large one, or the map's (Figma's filter). */
  icon: ReactNode;
  /** Where its tooltip points from, as the place it stands needs. */
  tooltip: TooltipPosition;
  /** What the e2e suites find it by. */
  testId: string;
}

/**
 * The sliders that open the route list's filter (ModeFilterCard), the IconButton's Base: on the
 * studio's Controller bar, and floating on the public map's corner (MapControlsDock). A filter on
 * puts a dot on the sliders, and their name says which, so the dot is never the only sign.
 */
export function ModeFilterButton({ modeFilter, icon, tooltip, testId }: ModeFilterButtonProps) {
  const filterCardId = useId();
  const filterCardRef = useRef<HTMLDivElement>(null);
  const { filter, onFilter } = modeFilter;
  const isFiltered = filter !== 'all';
  return (
    <span className="relative flex">
      <IconButton
        icon={icon}
        label={isFiltered ? `Filter: ${MODE_FILTER_LABEL[filter]}` : 'Filter'}
        tooltip={tooltip}
        data-testid={testId}
        popoverTarget={filterCardId}
      />
      {isFiltered && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-0 right-0 size-3 rounded-full bg-brand-surface ring-2 ring-surface"
        />
      )}
      <ModeFilterCard id={filterCardId} ref={filterCardRef} filter={filter} onFilter={onFilter} />
    </span>
  );
}
