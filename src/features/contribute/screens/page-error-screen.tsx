import { Button } from '@/design-system/primitives/button';

import { useFocusHeading } from '../common/use-focus-heading';

/**
 * What the contributor page shows when a screen of it fails (its code could not be fetched with
 * no signal, or a bug): the page's error boundary puts it in the page's place. No Figma frame of
 * its own, so it takes the Stopping screen's words and buttons (4501:19658) on a plain surface.
 *
 * The recorder lives inside the page, so it stops with it: the points kept so far stay on the
 * phone, and nothing new is recorded until Try again reloads and the ride, back as left open, is
 * resumed. The words say so. They are a stand-in until the owner writes them.
 */
export function PageErrorScreen() {
  const headingRef = useFocusHeading();
  return (
    <main className="flex min-h-dvh flex-col justify-center gap-12 bg-surface px-5 py-12 font-sn-pro">
      <div className="flex flex-col gap-2 text-center">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl/8 font-semibold text-content-primary focus:outline-none"
        >
          Para couldn’t open this screen
        </h1>
        <p className="text-base/6 text-content-quaternary">
          Recording is paused. What you’ve recorded so far is safe on this phone. Check your signal,
          then tap Try again to continue.
        </p>
      </div>
      <Button variant="primary" label="Try again" onClick={() => window.location.reload()} />
    </main>
  );
}
