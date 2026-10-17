import { Button } from '@/design-system/primitives/button';

import { useFocusHeading } from './use-focus-heading';

interface SavedScreenProps {
  /** Fixes the phone could not keep of the ride just saved. */
  failedFixWrites: number;
  onRecordAgain: () => void;
  /** Field test only: hands over the ride's file. Goes at contribute/13, when it is sent to the studio. */
  onDownload: () => void;
}

/** After Save: the ride is kept on this phone, and Record again. */
export function SavedScreen({ failedFixWrites, onRecordAgain, onDownload }: SavedScreenProps) {
  const headingRef = useFocusHeading();
  return (
    <section
      aria-labelledby="saved-heading"
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-surface p-4 text-center font-sn-pro text-content-primary"
    >
      <h1
        id="saved-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl/8 font-extrabold focus:outline-none"
      >
        Successfully recorded
      </h1>
      <p className="text-base/6 text-content-quaternary">Your ride is kept on this phone.</p>
      {failedFixWrites > 0 && (
        <p className="text-base/6">
          The phone could not keep {failedFixWrites} fixes of this ride.
        </p>
      )}
      <Button variant="primary" label="Record again" onClick={onRecordAgain} />
      {/* TODO: remove at contribute/13, when a saved recording is sent to the studio. Field test only: there is no database to read the ride from yet. */}
      <button
        type="button"
        onClick={onDownload}
        className="text-base/6 text-content-quaternary underline"
      >
        Download last recording
      </button>
    </section>
  );
}
