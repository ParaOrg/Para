import { Button } from '@/design-system/primitives/button';
import { useFocusHeading } from '@/shared/hooks/use-focus-heading';

interface PageErrorScreenProps {
  /** The line under the heading: what the person can do now. */
  description: string;
}

/**
 * What a page shows when a screen of it fails (its code could not be fetched with no signal, or
 * a bug): the page's error boundary puts it in the page's place. No Figma frame of its own, so
 * it takes the contributor Stopping screen's words and buttons (4501:19658) on a plain surface.
 *
 * The public map, the studio and the contributor page all use it; each passes its own line under
 * the heading. Those lines are stand-ins until the owner writes them.
 */
export function PageErrorScreen({ description }: PageErrorScreenProps) {
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
        <p className="text-base/6 text-content-quaternary">{description}</p>
      </div>
      <Button variant="primary" label="Try again" onClick={() => window.location.reload()} />
    </main>
  );
}
