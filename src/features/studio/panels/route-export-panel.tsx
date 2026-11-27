import { useId } from 'react';

import { Button } from '@/design-system/primitives/button';
import type { Hotspot } from '@/features/routes/model/hotspots';
import type { Direction } from '@/features/routes/model/routes';
import type { LngLat } from '@/shared/utils/geo';

import { useRouteExport, type RouteExportCalls } from './use-route-export';
import { EXPORT_FORMATS } from '../data/route-export';

export type { RouteExportCalls };

interface RouteExportPanelProps {
  /** The open route's directions: its outbound and its return, drawn or a slot. */
  directions: readonly Direction[];
  hotspots: readonly Hotspot[];
  hotspotsAlong: (directionId: string, line: readonly LngLat[]) => Hotspot[];
  calls?: RouteExportCalls;
}

/**
 * Export under the trip card's facts: the open route, both ways, as CSV,
 * GeoJSON or JSON. Each direction's full line is read first — the studio
 * lists overviews, thinned for the map — so the file holds the line as drawn.
 * The trip card is keyed on its route, so another route starts this afresh.
 */
export function RouteExportPanel({
  directions,
  hotspots,
  hotspotsAlong,
  calls,
}: RouteExportPanelProps) {
  const { busyFormat, problem, exportAs } = useRouteExport({
    directions,
    hotspots,
    hotspotsAlong,
    calls,
  });
  const heading = useId();

  return (
    <section
      data-testid="route-export"
      aria-labelledby={heading}
      aria-busy={busyFormat !== null}
      className="flex w-full flex-col gap-2 px-3 pb-4 font-sn-pro"
    >
      <h3 id={heading} className="text-sm/5 font-medium text-content-tertiary">
        Export route · both ways
      </h3>
      <div className="flex flex-wrap gap-2">
        {EXPORT_FORMATS.map(({ format, label }) => (
          <Button
            key={format}
            variant="secondary"
            label={busyFormat === format ? 'Exporting…' : label}
            disabled={busyFormat !== null}
            onClick={() => void exportAs(format)}
          />
        ))}
      </div>
      {problem && (
        <p role="alert" className="text-sm text-content-error">
          {problem}
        </p>
      )}
    </section>
  );
}
