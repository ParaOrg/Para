import { Button } from '@/design-system/primitives/button';

import { BackToMapButton } from './back-to-map-button';
import { useFocusHeading } from './use-focus-heading';

interface SavedScreenProps {
  /** Fixes the phone could not keep of the recording just saved. */
  failedFixWrites: number;
  /** Where the recording's upload stands, in words. */
  uploadText: string;
  onRecordAgain: () => void;
  /** Hands over the recording's file. */
  onDownload: () => void;
}

/** After Save: the recording is kept on this phone, and Record again. */
export function SavedScreen({
  failedFixWrites,
  uploadText,
  onRecordAgain,
  onDownload,
}: SavedScreenProps) {
  const headingRef = useFocusHeading();
  return (
    <>
      <BackToMapButton />
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
        <p className="text-base/6 text-content-quaternary">Your recording is kept on this phone.</p>
        <p aria-live="polite" className="text-base/6">
          {uploadText}
        </p>
        {failedFixWrites > 0 && (
          <p className="text-base/6">
            The phone could not keep {failedFixWrites} fixes of this recording.
          </p>
        )}
        <Button variant="primary" label="Record again" onClick={onRecordAgain} />
        <button
          type="button"
          onClick={onDownload}
          className="text-base/6 text-content-quaternary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content-primary"
        >
          Download last recording
        </button>
      </section>
    </>
  );
}
