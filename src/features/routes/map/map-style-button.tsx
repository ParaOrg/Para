import type { ComponentPropsWithoutRef } from 'react';

import { MapTypeIcon } from './map-type-icon';

/**
 * Round on its own (4176:10679); only its top when the LocatorButton sits
 * under it in LocationAndMap (4245:1966).
 */
export type MapStyleButtonCorners = 'all' | 'top';

const CORNERS = {
  all: 'rounded-full',
  top: 'rounded-t-full',
} satisfies Record<MapStyleButtonCorners, string>;

interface MapStyleButtonProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  | 'children'
  | 'className'
  | 'style'
  | 'dangerouslySetInnerHTML'
  | 'type'
  | 'aria-label'
  | 'aria-haspopup'
  | 'title'
> {
  corners?: MapStyleButtonCorners;
  /** The design the map shows now, for a mouse's hover hint. */
  currentLabel: string;
}

/**
 * The "MayLayers or Theme" button (Figma 4176:10679): a 48 px Special pill
 * holding `map-type`, that opens the Map Style card. Pressed is
 * InnerShadow/SpecialButtonPressed while touched, as on the LocatorButton.
 */
export function MapStyleButton({ corners = 'all', currentLabel, ...rest }: MapStyleButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      aria-label="Map design"
      // The toggle useMapStyleCard looks for, to measure from and to give the keyboard back to.
      aria-haspopup="dialog"
      title={`Map design: ${currentLabel}`}
      className={
        'group relative grid size-12 shrink-0 place-items-center bg-surface-tertiary text-content-primary ' +
        'outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-brand-surface ' +
        CORNERS[corners]
      }
    >
      <MapTypeIcon />
      {/* Figma's shadow lies over what the button holds, as on the LocatorButton. */}
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
