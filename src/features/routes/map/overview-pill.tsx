import type { MapLibreMap } from 'maplibre-gl';

import { Button } from '@/design-system/primitives/button';
import { OverviewIcon } from '@/shared/ui/map-control-icons';

import { useFocusMapOnHide } from './use-focus-map-on-hide';

interface OverviewPillProps {
  /** Whether it shows: something is framed and the camera is not on it (useOverview). */
  isShown: boolean;
  /** The camera onto what is framed (useOverview). */
  go: () => void;
  /** The map, whose canvas takes focus if the pill hides while it has it. */
  map: MapLibreMap | null;
}

/**
 * The public map's Overview (4831:51294): the Button's Secondary, its word then the Overview
 * drawing, among the controls floating on the map (MapControlsDock). A press takes the camera back
 * onto the open trip's route, or the picked cards' routes; it shows only while the camera is off
 * them, so at the overview it is hidden, and out of the keyboard's way.
 */
export function OverviewPill({ isShown, go, map }: OverviewPillProps) {
  const ref = useFocusMapOnHide(isShown, map);
  return (
    // Figma's shadow-sm under it, as under every control floating on the map.
    <div ref={ref} hidden={!isShown} data-testid="overview" className="flex rounded-full shadow-sm">
      <Button variant="secondary" label="Overview" lastIcon={<OverviewIcon />} onClick={go} />
    </div>
  );
}
