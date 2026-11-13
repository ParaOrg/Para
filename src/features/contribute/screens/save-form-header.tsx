import { useFocusHeading } from '@/shared/hooks/use-focus-heading';

interface SaveFormHeaderProps {
  /** The form is labelled by its heading. */
  headingId: string;
}

/**
 * Save Recording's title (4725:29214), focused as the form opens. The form still saves itself
 * after ten minutes left alone (useSaveCountdown); the frame no longer says so.
 */
export function SaveFormHeader({ headingId }: SaveFormHeaderProps) {
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
    </header>
  );
}
