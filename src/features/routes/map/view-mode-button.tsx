import type { ReactNode } from 'react';

import type { ViewMode } from './view-mode';
import { ThreeDIcon, TwoDIcon } from './view-mode-icons';

/**
 * Round on its own, or only its bottom when it is the lower half of the LocationAndMap pill, under
 * MapStyleButton's top (4885:42127).
 */
export type ViewModeButtonCorners = 'all' | 'bottom';

const CORNERS = {
  all: 'rounded-full',
  bottom: 'rounded-b-full',
} satisfies Record<ViewModeButtonCorners, string>;

/** The glyph and the name of the view a tap switches to. */
const TARGET = {
  '2d': { icon: <ThreeDIcon />, label: 'Switch to 3D view' },
  '3d': { icon: <TwoDIcon />, label: 'Switch to 2D view' },
} satisfies Record<ViewMode, { icon: ReactNode; label: string }>;

interface ViewModeButtonProps {
  /** The view the map shows now (useViewMode). */
  mode: ViewMode;
  /** A tap: the other view. */
  onToggle: () => void;
  corners?: ViewModeButtonCorners;
}

/**
 * The 2D/3D button (4885:42127's lower half): a 48 px Special pill, as MapStyleButton is, showing
 * the view a tap switches to: "3D" over a 2D map, "2D" over a 3D one. Its name says the same.
 */
export function ViewModeButton({ mode, onToggle, corners = 'all' }: ViewModeButtonProps) {
  const { icon, label } = TARGET[mode];
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onToggle}
      className={
        'group relative grid size-12 shrink-0 place-items-center bg-surface-tertiary text-content-primary ' +
        'outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-brand-surface ' +
        CORNERS[corners]
      }
    >
      {icon}
      {/* The Special shadow lies over what the button holds, as on MapStyleButton. */}
      <span
        aria-hidden
        className={
          'pointer-events-none absolute inset-0 shadow-special-button-rest group-active:shadow-special-button-pressed ' +
          CORNERS[corners]
        }
      />
    </button>
  );
}
