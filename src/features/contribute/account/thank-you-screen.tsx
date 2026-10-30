import { Button } from '@/design-system/primitives/button';

import thumbsUp from './thumbs-up.svg';
import { useFocusHeading } from '../common/use-focus-heading';

interface ThankYouScreenProps {
  /** Leads on: the gate lets go, and the page goes on to what comes after an account. */
  onContinue: () => void;
}

/** After a sign-up (Figma 4461:4615): the thumbs-up, the thanks, and Continue. */
export function ThankYouScreen({ onContinue }: ThankYouScreenProps) {
  const headingRef = useFocusHeading();

  return (
    <section
      aria-labelledby="thank-you-heading"
      className="absolute inset-0 z-20 overflow-y-auto bg-surface font-sn-pro text-content-primary"
    >
      {/* The other pages' back-button row (64) and the 48 under it: where Figma puts the heading. */}
      <div className="flex flex-col gap-12 px-4 pt-[calc(env(safe-area-inset-top)+7rem)] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col items-center gap-4">
          <img src={thumbsUp} alt="" className="size-20" />
          <div className="flex flex-col gap-2 text-center">
            <h1
              id="thank-you-heading"
              ref={headingRef}
              tabIndex={-1}
              className="text-3xl/9 font-bold outline-none"
            >
              Thank you for signing up!
            </h1>
            <p className="text-base-lower/6 text-content-tertiary">
              Your account is ready. If you ever forget your password, tap Forgot password on the
              sign-in screen and enter your email.
            </p>
          </div>
        </div>
        <Button variant="primary" label="Continue" onClick={onContinue} />
      </div>
    </section>
  );
}
