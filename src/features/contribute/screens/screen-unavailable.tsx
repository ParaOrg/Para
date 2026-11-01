import { Button } from '@/design-system/primitives/button';

import { TOOLBAR_ROOM } from './bottom-toolbar';
import { useFocusHeading } from '../common/use-focus-heading';

interface ScreenUnavailableProps {
  /** The screen that could not be opened, as its tab names it: History, Account. */
  name: string;
  /** Fetches the screen again, in place. */
  onTryAgain: () => void;
}

/**
 * Stands in for a toolbar screen whose code could not be fetched (offline before the page kept
 * it): says so, and Try again fetches it afresh, so the screen opens once the phone is back
 * online without reloading the page. The toolbar stays over its foot. No Figma frame draws this
 * yet: the plainest screen the page has, the History screen's surface and type.
 */
export function ScreenUnavailable({ name, onTryAgain }: ScreenUnavailableProps) {
  const headingRef = useFocusHeading();
  return (
    <section
      aria-labelledby="screen-unavailable-heading"
      className="tab-screen absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-surface px-8 text-center font-sn-pro text-content-primary"
    >
      <h1
        id="screen-unavailable-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-xl/7 font-semibold outline-none"
      >
        {name} could not be opened
      </h1>
      <p className="text-sm/5 text-content-tertiary">Check your connection, then try again.</p>
      <Button variant="primary" label="Try again" onClick={onTryAgain} />
      <div aria-hidden className={TOOLBAR_ROOM} />
    </section>
  );
}
