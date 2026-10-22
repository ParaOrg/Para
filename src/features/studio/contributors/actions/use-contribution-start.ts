import type { MapLibreMap } from 'maplibre-gl';
import { useState } from 'react';

import { bboxOf, type LngLat } from '@/shared/utils/geo';

import type { ContributionStart } from './contribution-start';
import { recordContributionUses } from '../../data/contributions-write';
import { fetchContributionsWithHintoIn } from '../../data/hintos-read';
import type { Drawing } from '../../drawing/use-drawing';

/** The part of a drawing the start needs; the Playground's own state. */
type StartableDrawing = Pick<
  Drawing,
  'drawing' | 'startWithPoints' | 'loadArea' | 'cancel' | 'controlPoints'
>;

interface UseContributionStartOptions {
  map: MapLibreMap | null;
  draw: StartableDrawing;
  /** Says something in the Playground's toast. */
  setNotice: (text: string | null) => void;
}

/**
 * A drawing that came from an upload: Use this line and Draw a hintuan here
 * begin it, and its save records which uploads it came from
 * (`contribution_use`). Held only while that drawing lasts.
 */
export function useContributionStart({ map, draw, setNotice }: UseContributionStartOptions) {
  const [start, setStart] = useState<ContributionStart | null>(null);
  // The drawing ended (saved, cancelled): so did where it came from.
  if (!draw.drawing && start) setStart(null);

  /** Begins the drawing in the Playground; one already under way is never thrown away. */
  const begin = (next: ContributionStart) => {
    if (draw.drawing) {
      setNotice('Finish or cancel the drawing in progress first, then start again.');
      return;
    }
    const around: LngLat[] = next.kind === 'direction' ? next.points : next.ring;
    const [west, south, east, north] = bboxOf(around);
    map?.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 80, maxZoom: 18, duration: 0 },
    );
    setStart(next);
    if (next.kind === 'direction') draw.startWithPoints(next.points);
    else draw.loadArea('hintuan', null, next.ring);
  };

  /** After a save: records the uploads the saved direction or hintuan came from; a failure is said. */
  const recordSaved = async (subjectId: string, ring: readonly LngLat[]) => {
    if (!start) return;
    try {
      const contributionIds =
        start.kind === 'direction'
          ? [start.contributionId]
          : await fetchContributionsWithHintoIn(ring);
      await recordContributionUses(
        contributionIds.map((contributionId) => ({ contributionId, kind: start.kind, subjectId })),
      );
    } catch (err) {
      setNotice(
        `Saved, but ${err instanceof Error ? err.message : 'the uploads it came from were not recorded.'}`,
      );
    }
  };

  return { start, begin, forget: () => setStart(null), recordSaved };
}
