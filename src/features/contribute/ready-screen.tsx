import { IconButton } from '@/design-system/primitives/icon-button';
import { ChevronLeftIcon } from '@/shared/ui/route-icons';

import { ConsentPanel } from './consent-panel';
import { TrackingButton } from './tracking-button';
import { HistoryIcon } from './tracking-icons';
import { useFocusHeading } from './use-focus-heading';
import { useStackRoom } from './use-stack-room';

interface ReadyScreenProps {
  hasConsent: boolean;
  onConsent: () => void;
  onStart: () => void;
  onOpenHistory: () => void;
}

const goBackToMap = () => window.location.assign('/');

/**
 * Before a recording: back to the map, History, and one Start bar (or, on a first visit, what the
 * page does). History is a screen of its own, so nothing of it shows here.
 */
export function ReadyScreen({ hasConsent, onConsent, onStart, onOpenHistory }: ReadyScreenProps) {
  const headingRef = useFocusHeading();
  const stackRef = useStackRoom();

  return (
    <>
      <div className="absolute top-0 left-0 z-10 flex gap-2 pt-[max(1rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))]">
        <IconButton
          tooltip="top"
          label="Back to the map"
          icon={<ChevronLeftIcon />}
          onClick={goBackToMap}
        />
        {hasConsent && (
          <IconButton
            tooltip="top"
            label="History"
            icon={<HistoryIcon />}
            onClick={onOpenHistory}
          />
        )}
      </div>
      {hasConsent ? (
        <section
          ref={stackRef}
          aria-labelledby="ready-heading"
          className="absolute inset-x-0 bottom-0 z-10 pb-[env(safe-area-inset-bottom)]"
        >
          <h1 id="ready-heading" ref={headingRef} tabIndex={-1} className="sr-only">
            Record a route
          </h1>
          <TrackingButton variant="start" onClick={onStart} />
        </section>
      ) : (
        <ConsentPanel onAgree={onConsent} onDecline={goBackToMap} />
      )}
    </>
  );
}
