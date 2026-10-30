import { IconButton } from '@/design-system/primitives/icon-button';
import { ChevronLeftIcon } from '@/shared/ui/route-icons';

import { isNativeApp } from '../native-bridge/native-app';

/** A ride is written to the phone fix by fix, so leaving mid-recording brings it back as unfinished. */
export const goBackToMap = () => window.location.assign('/');

/**
 * The top-left way out of the contributor page, to the public map. The web page only: the
 * Android app is the contributor page alone, with no map to go back to, so there it shows nothing.
 */
export function BackToMapButton() {
  if (isNativeApp()) return null;
  return (
    // Above the Saved screen, which covers the page.
    <div className="absolute top-0 left-0 z-30 pt-[max(1rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))]">
      <IconButton
        tooltip="top"
        size="large"
        label="Back to the map"
        icon={<ChevronLeftIcon />}
        onClick={goBackToMap}
      />
    </div>
  );
}
