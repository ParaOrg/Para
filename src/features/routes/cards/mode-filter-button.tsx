import { Suspense, useRef, useState, type ReactNode } from 'react';

import { IconButton, type TooltipPosition } from '@/design-system/primitives/icon-button';
import { retryingLazy } from '@/shared/lib/retrying-lazy';
import { retryingImport } from '@/shared/utils/retrying-import';

import { pickCount, picksNamed, type ModeFilterControl } from '../model/mode-filter';

// Loaded on the first tap, so the page carries none of it until the filter is opened.
const ModeFilterMenu = retryingLazy(() =>
  retryingImport(() => import('./mode-filter-menu'))().then((module) => module.ModeFilterMenu),
);

/** The filter as a list hands it to its button: the picks, and how many routes they leave. */
export interface ListModeFilter extends ModeFilterControl {
  /** How many routes the list shows under the picks, for the menu's "Show 36 routes". */
  routeCount: number;
}

interface ModeFilterButtonProps {
  /** The filter, kept by the caller, who lights the map to match. */
  modeFilter: ListModeFilter;
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
 * The funnel that opens the route list's filter (ModeFilterMenu), an IconButton: on the studio's
 * Controller bar, and floating on the public map's corner (MapControlsDock). The modes picked show
 * as the IconButton's count (the Indicator), none under All, and its name says which ("Filter:
 * Jeepney, Bus"), so the badge is never the only sign. The menu closed, the focus comes back here.
 */
export function ModeFilterButton({
  modeFilter,
  icon,
  tooltip,
  testId,
  size = 'base',
}: ModeFilterButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { picks, onPicks, routeCount } = modeFilter;
  const count = pickCount(picks);
  // The dialog, closed, has handed the focus back already; this keeps it here should the
  // browser not, as an older one may not.
  const handleClose = () => {
    setIsOpen(false);
    buttonRef.current?.focus();
  };
  return (
    <span className="relative flex">
      <IconButton
        ref={buttonRef}
        size={size}
        count={count}
        icon={icon}
        label={count > 0 ? `Filter: ${picksNamed(picks)}` : 'Filter'}
        tooltip={tooltip}
        aria-haspopup="dialog"
        data-testid={testId}
        onClick={() => setIsOpen(true)}
      />
      {isOpen && (
        <Suspense fallback={null}>
          <ModeFilterMenu
            picks={picks}
            onPicks={onPicks}
            routeCount={routeCount}
            onClose={handleClose}
          />
        </Suspense>
      )}
    </span>
  );
}
