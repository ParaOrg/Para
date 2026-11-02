import { Button } from '@/design-system/primitives/button';

import { SCREEN_HASH_ATTR } from '../common/data-attributes';
import { useFocusHeading } from '../common/use-focus-heading';
import type { ScreenHash } from '../navigation/screen-routes';
import { TOOLBAR_ROOM } from '../toolbar/toolbar-place';

interface ScreenUnavailableProps {
  /** The screen that could not be opened, as its tab names it: History, Account. */
  name: string;
  /** Its hash, as the screen itself carries it, so a move to it waits for this in its place. */
  screenHash: ScreenHash;
  /** Whether its code could not be fetched (offline), rather than something else going wrong. */
  hasFetchFailed: () => boolean;
  /** Fetches the screen again, in place. */
  onTryAgain: () => void;
}

/**
 * Stands in for a toolbar screen that could not be drawn: its code could not be fetched (offline
 * before the page kept it), or it failed as it drew. Says which, and Try again draws it afresh,
 * with a fresh fetch, so it opens once the phone is back online without reloading the page. The toolbar stays over its foot. No Figma frame draws this
 * yet: the plainest screen the page has, the History screen's surface and type.
 */
export function ScreenUnavailable({
  name,
  screenHash,
  hasFetchFailed,
  onTryAgain,
}: ScreenUnavailableProps) {
  const headingRef = useFocusHeading();
  return (
    <section
      {...{ [SCREEN_HASH_ATTR]: screenHash }}
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
      <p className="text-sm/5 text-content-tertiary">
        {hasFetchFailed()
          ? 'Check your connection, then try again.'
          : 'Something went wrong. Try again, or reload the page if it keeps happening.'}
      </p>
      <Button variant="primary" label="Try again" onClick={onTryAgain} />
      <div aria-hidden className={TOOLBAR_ROOM} />
    </section>
  );
}
