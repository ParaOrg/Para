import type { MapLibreMap } from 'maplibre-gl';

import type { ContributionStart } from './actions/contribution-start';

export interface StudioContributorsProps {
  map: MapLibreMap | null;
  isSignedIn: boolean;
  onSignIn: () => void;
  onOpenPlayground: () => void;
  /** Use this line and Draw a hintuan here: the Playground opens with the drawing begun. */
  onStart: (start: ContributionStart) => void;
}
