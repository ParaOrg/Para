import { Button } from '@/design-system/primitives/button';

interface DraftSignboardsNoticeProps {
  /** Reading the editor's draft of the route, or that read failed. */
  state: 'loading' | 'error';
  /** Reads the draft again; offered only when the read failed. */
  onRetry?: () => void;
}

/**
 * What stands where the signboards go while the editor's draft of the route is
 * read: a change is saved on top of that draft, so the boards are not offered
 * until its list is known.
 */
export function DraftSignboardsNotice({ state, onRetry }: DraftSignboardsNoticeProps) {
  if (state === 'loading')
    return (
      <p role="status" className="px-3 pb-4 font-sn-pro text-sm text-content-quaternary">
        Loading signboards…
      </p>
    );
  return (
    <div className="flex flex-col items-start gap-2 px-3 pb-4 font-sn-pro">
      <p role="alert" className="text-sm text-content-error">
        Couldn&apos;t read your draft&apos;s signboards. Try again before changing them.
      </p>
      <Button variant="secondary" label="Try again" onClick={onRetry} />
    </div>
  );
}
