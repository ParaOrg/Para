import { useId, useRef, type ReactNode } from 'react';

import { IconButton, type TooltipPosition } from '@/design-system/primitives/icon-button';

import { ModeFilterCard } from './mode-filter-card';
import { MODE_FILTER_LABEL, modesPicked, type ModeFilterControl } from '../model/mode-filter';

interface ModeFilterButtonProps {
  /** The filter, kept by the caller, who lights the map to match. */
  modeFilter: ModeFilterControl;
  /** The sliders' drawing: the Controller's large one, or the map's (Figma's filter). */
  icon: ReactNode;
  /** Where its tooltip points from, as the place it stands needs. */
  tooltip: TooltipPosition;
  /** What the e2e suites find it by. */
  testId: string;
  /** The IconButton's size: Base on the studio's Controller, Large where a page draws it so. */
  size?: 'base' | 'large';
}

/**
 * The funnel that opens the route list's filter (ModeFilterCard), an IconButton: on the studio's
 * Controller bar, and floating on the public map's corner (MapControlsDock). The modes picked show
 * as the IconButton's count (the Indicator), none under All, and its name says which, so the
 * badge is never the only sign.
 */
export function ModeFilterButton({
  modeFilter,
  icon,
  tooltip,
  testId,
  size = 'base',
}: ModeFilterButtonProps) {
  const filterCardId = useId();
  const filterCardRef = useRef<HTMLDivElement>(null);
  const { filter, onFilter } = modeFilter;
  const isFiltered = filter !== 'all';
  return (
    <span className="relative flex">
      <IconButton
        size={size}
        count={modesPicked(filter)}
        icon={icon}
        label={isFiltered ? `Filter: ${MODE_FILTER_LABEL[filter]}` : 'Filter'}
        tooltip={tooltip}
        data-testid={testId}
        popoverTarget={filterCardId}
      />
      <ModeFilterCard id={filterCardId} ref={filterCardRef} filter={filter} onFilter={onFilter} />
    </span>
  );
}
