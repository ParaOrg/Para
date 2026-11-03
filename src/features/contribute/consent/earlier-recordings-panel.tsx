import { Button } from '@/design-system/primitives/button';

import { useFocusHeading } from '../common/use-focus-heading';

/** The question about recordings made before the current consent text, and what answers it. */
export interface EarlierQuestion {
  /** Recordings made before the current text, not yet sent. */
  count: number;
  onSend: () => void;
  onKeep: () => void;
}

/**
 * Asked once, after sign-in: whether recordings made before the second consent text may go too.
 * At the foot of Start, under its tabs, in the Start Tracking bar's place.
 */
export function EarlierRecordingsPanel({ count, onSend, onKeep }: EarlierQuestion) {
  const headingRef = useFocusHeading();
  const noun = count === 1 ? 'recording' : 'recordings';
  return (
    <section
      aria-labelledby="earlier-heading"
      className="flex max-h-dvh flex-col gap-4 overflow-y-auto bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] font-sn-pro text-content-primary shadow-bottom-sheet-top-shadow"
    >
      <h1
        id="earlier-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-xl/7 font-extrabold focus:outline-none"
      >
        Send your {count} earlier {noun} too?
      </h1>
      <p className="text-base/6">
        {count === 1 ? 'It was' : 'They were'} made before you agreed to how recordings are used.
        Kept on this phone, {count === 1 ? 'it' : 'they'} can still be sent later from History.
      </p>
      <div className="flex flex-col gap-2">
        <Button variant="primary" label="Send" onClick={onSend} />
        <Button variant="secondary" label="Keep on phone" onClick={onKeep} />
      </div>
    </section>
  );
}
