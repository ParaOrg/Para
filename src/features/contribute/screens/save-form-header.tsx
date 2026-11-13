import { useFocusHeading } from '@/shared/hooks/use-focus-heading';

import { countdownText } from '../common/format';

interface SaveFormHeaderProps {
  /** The form is labelled by its heading. */
  headingId: string;
  secondsLeft: number;
}

/** Save Recording's title, focused as the form opens, and how long until it saves itself. */
export function SaveFormHeader({ headingId, secondsLeft }: SaveFormHeaderProps) {
  const headingRef = useFocusHeading();
  return (
    <header className="shrink-0 px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-3">
      <h1
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="text-3xl/9 font-extrabold focus:outline-none"
      >
        Save Recording
      </h1>
      <p className="text-sm/5 text-content-disabled">
        Saves by itself in {countdownText(secondsLeft)}
      </p>
    </header>
  );
}
