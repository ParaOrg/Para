import type { MapLibreMap } from 'maplibre-gl';

export interface StudioContributorsProps {
  map: MapLibreMap | null;
  isSignedIn: boolean;
  onSignIn: () => void;
  onOpenPlayground: () => void;
}
