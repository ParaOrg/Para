import type { MapLibreMap } from 'maplibre-gl';

import type { DraftRow } from '../data/review-schema';

export interface StudioReviewProps {
  map: MapLibreMap | null;
  onChanged: () => void;
  /**
   * Where Drafts stands: the studio's top bar on a computer, clear of the map's own controls.
   * Without one it stands on the map, as on a phone, where the top bar is the map switch's.
   */
  buttonSlot?: HTMLElement | null;
  /**
   * A draft tapped on the map: opened straight into editing where it can be, and true; false
   * leaves it to Drafts, where it is reviewed.
   */
  onOpenDraft?: (draft: DraftRow) => boolean;
}
