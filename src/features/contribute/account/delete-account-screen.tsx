import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { Button } from '@/design-system/primitives/button';
import { useFocusHeading } from '@/shared/hooks/use-focus-heading';

import { DELETE_ACCOUNT_LEAD, PHONE_AND_STATS, UPLOADS_KEPT } from './delete-account-words';
import { HandQuestion } from './hand-question';
import { SettingsHeader } from './settings-header';
import { useCountdown } from './use-countdown';
import { SCREEN_HASH_ATTR } from '../common/data-attributes';
import { useClosedWhenHidden } from '../common/use-closed-when-hidden';
import { useScreenEntry } from '../motion/use-screen-entry';
import { SCREENS } from '../navigation/screen-routes';

/** How long Delete account waits, counting down, before it can be pressed. */
const WAIT_SECONDS = 5;

interface DeleteAccountScreenProps {
  isDeleting: boolean;
  /** One line about a Delete account that failed, or null. */
  error: string | null;
  /** The question opens: a last try's error is not carried into it. */
  onAsked: () => void;
  onDelete: () => void;
  onBack: () => void;
}

/**
 * Delete account (Figma 4543:5309), from Account settings: what goes and what stays. The uploads
 * always stay on Para, with the name taken off them, so the frame's "Also delete my uploaded
 * routes" switch is not drawn. Delete account counts down from 5 before it can be pressed, then
 * asks once more over the frosted page.
 */
export function DeleteAccountScreen({
  isDeleting,
  error,
  onAsked,
  onDelete,
  onBack,
}: DeleteAccountScreenProps) {
  const headingRef = useFocusHeading();
  const entryRef = useScreenEntry<HTMLElement>();
  const [isAsked, setIsAsked] = useState(false);
  useClosedWhenHidden(setIsAsked, false);
  const secondsLeft = useCountdown(WAIT_SECONDS);
  const isWaiting = secondsLeft > 0;
  const deleteRef = useRef<HTMLDivElement>(null);
  // Back on Delete account once the page is live again: it was inert under the question.
  const handleCancel = () => {
    flushSync(() => setIsAsked(false));
    deleteRef.current?.querySelector('button')?.focus();
  };

  return (
    <section
      ref={entryRef}
      aria-labelledby="delete-account-heading"
      {...{ [SCREEN_HASH_ATTR]: SCREENS.deleteAccount.hash }}
      className="tab-screen absolute inset-0 z-30 flex flex-col bg-surface font-sn-pro text-content-primary"
    >
      <div inert={isAsked} className="flex min-h-0 flex-1 flex-col">
        <SettingsHeader
          title="Delete account"
          headingId="delete-account-heading"
          headingRef={headingRef}
          onBack={onBack}
        />
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pt-5 pb-[max(2rem,env(safe-area-inset-bottom))] text-base-lower/6">
          <div className="flex flex-col gap-6">
            <p>
              {DELETE_ACCOUNT_LEAD} {UPLOADS_KEPT}
            </p>
            <p>{PHONE_AND_STATS}</p>
          </div>
          <div ref={deleteRef} className="*:w-full">
            <Button
              variant="plain"
              tone="error"
              label={isWaiting ? `Delete account (${secondsLeft})` : 'Delete account'}
              disabled={isWaiting}
              onClick={() => {
                onAsked();
                setIsAsked(true);
              }}
            />
          </div>
          {/* Said once, when the wait is over: a count read out every second would only be noise. */}
          <p role="status" className="sr-only">
            {isWaiting ? '' : 'Delete account can be pressed now.'}
          </p>
        </div>
      </div>
      {isAsked && (
        <HandQuestion
          title="Do you want to delete your account?"
          text="This can’t be undone."
          error={error}
          confirmLabel="Delete this account"
          confirmVariant="error"
          busyLabel="Deleting…"
          cancelLabel="No, I change my mind"
          isBusy={isDeleting}
          onConfirm={onDelete}
          onCancel={handleCancel}
        />
      )}
    </section>
  );
}
