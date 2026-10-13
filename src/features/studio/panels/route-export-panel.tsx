import { useId, useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import type { Hotspot } from '@/features/routes/model/hotspots';
import { isDrawn, type Direction, type LineStringGeoJSON } from '@/features/routes/model/routes';
import type { LngLat } from '@/shared/utils/geo';

import { lineOf } from '../data/live';
import {
  EXPORT_FORMATS,
  exportFile,
  routeExport,
  type ExportFile,
  type ExportFormat,
} from '../data/route-export';

/** What the panel reads and saves with; the live ones unless a story passes its own. */
export interface RouteExportCalls {
  loadLine: (directionId: string) => Promise<LineStringGeoJSON | null>;
  save: (file: ExportFile) => void;
}

const LIVE: RouteExportCalls = { loadLine: lineOf, save: saveFile };

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
  calls = LIVE,
}: RouteExportPanelProps) {
  const [busyFormat, setBusyFormat] = useState<ExportFormat | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const heading = useId();

  const handleExport = async (format: ExportFormat) => {
    setBusyFormat(format);
    setProblem(null);
    try {
      const withFullLines = await Promise.all(
        directions.map(async (v) => {
          if (!isDrawn(v)) return v;
          const shape = await calls.loadLine(v.id);
          // Never the overview in its place: the file would hold a thinned line as the drawn one.
          if (!shape) throw new Error(`the line of ${v.name ?? 'a direction'} could not be read`);
          return { ...v, shape };
        }),
      );
      const data = routeExport(withFullLines, hotspots, hotspotsAlong, new Date().toISOString());
      calls.save(exportFile(data, format));
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      setProblem(`Couldn't export this route (${reason}). Check your connection and try again.`);
    } finally {
      setBusyFormat(null);
    }
  };

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
            onClick={() => void handleExport(format)}
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

/** Hand the file to the browser as a download. */
function saveFile({ fileName, mimeType, text }: ExportFile): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Revoked on the next task: some browsers start the download only after the click returns.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
