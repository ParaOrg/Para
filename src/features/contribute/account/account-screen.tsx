import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { useFocusHeading } from '@/shared/hooks/use-focus-heading';

import { CommuteStats, type CommuteStatsState } from './commute-stats';
import { GeneralBar } from './general-bar';
import { LogoutConfirm } from './logout-confirm';
import { ProfileCard } from './profile-card';
import { SCREEN_HASH_ATTR } from '../common/data-attributes';
import { useClosedWhenHidden } from '../common/use-closed-when-hidden';
import { useScreenEntry } from '../motion/use-screen-entry';
import { SCREENS } from '../navigation/screen-routes';
import { TOOLBAR_FOOT, TOOLBAR_ROOM } from '../toolbar/toolbar-place';

interface AccountScreenProps {
  /** The contributor's name, or null while it loads. */
  name: string | null;
  email: string;
  /** The Commute Statistics, or null to leave them out (the project has none to give yet). */
  stats: CommuteStatsState | null;
  /** Saved recordings not yet sent, for Logout's warning. */
  unsentCount: number;
  isLoggingOut: boolean;
  /** One line about the last Logout, or null. */
  error: string | null;
  onOpenSettings: () => void;
  onLogout: () => void;
  /** The Logout question opens: a last Logout's error is not carried into it. */
  onLogoutAsked: () => void;
}

/**
 * Account (Figma 4496:10455): the profile card, the Commute Statistics, and General: Account
 * settings and Logout, which asks first, under the page's toolbar (contribute-page.tsx) with
 * Account marked.
 */
export function AccountScreen({
  name,
  email,
  stats,
  unsentCount,
  isLoggingOut,
  error,
  onOpenSettings,
  onLogout,
  onLogoutAsked,
}: AccountScreenProps) {
  const headingRef = useFocusHeading();
  const entryRef = useScreenEntry<HTMLElement>();
  const [isLogoutAsked, setIsLogoutAsked] = useState(false);
  useClosedWhenHidden(setIsLogoutAsked, false);
  const logoutRef = useRef<HTMLButtonElement>(null);
  // Back on the Logout row once the page is live again: it was inert under the question.
  const handleLogoutCancel = () => {
    flushSync(() => setIsLogoutAsked(false));
    logoutRef.current?.focus();
  };

  return (
    <section
      ref={entryRef}
      aria-labelledby="account-heading"
      {...{ [SCREEN_HASH_ATTR]: SCREENS.profile.hash }}
      className="tab-screen absolute inset-0 z-20 bg-surface font-sn-pro text-content-primary"
    >
      <div inert={isLogoutAsked} className="absolute inset-0">
        <div className="flex h-full flex-col gap-8 overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-40">
          <h1 id="account-heading" ref={headingRef} tabIndex={-1} className="sr-only">
            Account
          </h1>
          <ProfileCard name={name} email={email} />
          {stats && <CommuteStats state={stats} />}
          <section aria-labelledby="general-heading" className="flex flex-col gap-4">
            <h2 id="general-heading" className="text-xl/7 font-semibold">
              General
            </h2>
            <div className="flex flex-col">
              <GeneralBar
                icon="settings"
                label="Account settings"
                hasChevron
                onClick={onOpenSettings}
              />
              <GeneralBar
                icon="logout"
                label="Logout"
                tone="error"
                onClick={() => {
                  onLogoutAsked();
                  setIsLogoutAsked(true);
                }}
                ref={logoutRef}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm/5 text-content-error">
                {error}
              </p>
            )}
          </section>
        </div>
        {/* The page fading out under the page's toolbar (4514:23035), which stands over this foot
            (TOOLBAR_FOOT), as on Record and History, for one height everywhere. */}
        <div
          aria-hidden
          className={
            'pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-b from-transparent to-surface pt-6 ' +
            TOOLBAR_FOOT
          }
        >
          <div className={TOOLBAR_ROOM} />
        </div>
      </div>
      {isLogoutAsked && (
        <LogoutConfirm
          unsentCount={unsentCount}
          isLoggingOut={isLoggingOut}
          error={error}
          onLogout={onLogout}
          onCancel={handleLogoutCancel}
        />
      )}
    </section>
  );
}
