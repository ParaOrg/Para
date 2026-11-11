import type { MapLibreMap } from 'maplibre-gl';
import { useState, type ReactNode } from 'react';

import { MapStyleRowsContext } from '@/features/routes/map/map-style-rows';
import { MapStyleSwitchRow } from '@/features/routes/map/map-style-switch-row';
import { useFootbridges } from '@/features/routes/map/use-footbridges';

interface FootbridgesSwitchProps {
  map: MapLibreMap | null;
  /** The map's controls, whose Map Style card shows the switch. */
  children: ReactNode;
}

/**
 * The studio's footbridges (.scratch/footbridges, ticket 03): the public map's layer, the same
 * file, read-only, shown while a Footbridges switch in the Map Style card is on. Off at first, so
 * an editor turns it on when placing a hintuan near a crossing; it is not kept between visits. It
 * marks nothing and changes no draft. The workshop and the Contributors map share one map, so one
 * switch serves both.
 */
export function FootbridgesSwitch({ map, children }: FootbridgesSwitchProps) {
  const [isOn, setIsOn] = useState(false);
  useFootbridges(map, isOn);
  return (
    <MapStyleRowsContext
      value={
        <MapStyleSwitchRow label="Footbridges" isOn={isOn} onToggle={() => setIsOn((on) => !on)} />
      }
    >
      {children}
    </MapStyleRowsContext>
  );
}
