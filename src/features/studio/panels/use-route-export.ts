import { useState } from 'react';

import type { Hotspot } from '@/features/routes/model/hotspots';
import { isDrawn, type Direction, type LineStringGeoJSON } from '@/features/routes/model/routes';
import type { LngLat } from '@/shared/utils/geo';

import { lineOf } from '../data/live';
import { exportFile, routeExport, type ExportFile, type ExportFormat } from '../data/route-export';

/** What an export reads and saves with; the live ones unless a story passes its own. */
export interface RouteExportCalls {
  loadLine: (directionId: string) => Promise<LineStringGeoJSON | null>;
  save: (file: ExportFile) => void;
}

const LIVE: RouteExportCalls = { loadLine: lineOf, save: saveFile };

interface RouteExportInput {
  /** The open route's directions: its outbound and its return, drawn or a slot. */
  directions: readonly Direction[];
  hotspots: readonly Hotspot[];
  hotspotsAlong: (directionId: string, line: readonly LngLat[]) => Hotspot[];
  calls?: RouteExportCalls;
}

/**
 * The open route, both ways, saved as CSV, GeoJSON or JSON: each direction's full line read first
 * (the studio lists overviews, thinned for the map), so the file holds the line as drawn. Says
 * which format is on its way, and what went wrong when one fails.
 */
export function useRouteExport({
  directions,
  hotspots,
  hotspotsAlong,
  calls = LIVE,
}: RouteExportInput) {
  const [busyFormat, setBusyFormat] = useState<ExportFormat | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const exportAs = async (format: ExportFormat) => {
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

  return { busyFormat, problem, exportAs };
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
