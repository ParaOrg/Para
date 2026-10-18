import { Marker, type MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';

import { reviewAnchor } from '../data/review-geometry';
import { reviewDraftOf } from '../data/review-label';
import type { DraftRow } from '../data/review-schema';

interface DraftMarkersProps {
  map: MapLibreMap | null;
  drafts: DraftRow[];
  places: ReadonlyMap<string, string>;
  onReview: (id: string) => void;
}
export function DraftMarkers({ map, drafts, places, onReview }: DraftMarkersProps) {
  useEffect(() => {
    if (!map) return;
    const markers: Marker[] = [];
    for (const draft of drafts) {
      const at = reviewAnchor(draft.payload);
      if (!at) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${draft.status === 'pending' ? 'Pending' : 'Draft'}: ${reviewDraftOf(draft, places).label}`;
      button.className =
        'max-w-48 truncate rounded-full border border-border-primary bg-surface px-3 py-2 text-sm font-bold text-content-primary shadow-lg';
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        onReview(draft.id);
      });
      markers.push(new Marker({ element: button }).setLngLat(at).addTo(map));
    }
    return () => markers.forEach((marker) => marker.remove());
  }, [map, drafts, places, onReview]);
  return null;
}
