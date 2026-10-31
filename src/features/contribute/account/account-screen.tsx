import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { CommuteStats, type CommuteStatsState } from './commute-stats';
import { GeneralBar } from './general-bar';
import { LogoutSheet } from './logout-sheet';
import { ProfileCard } from './profile-card';
import { useFocusHeading } from '../common/use-focus-heading';
import { BottomToolbar } from '../screens/bottom-toolbar';

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
  /** History, in the toolbar. */
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  /** Record, in the toolbar: back to Start. */
  onOpenRecord: () => void;
}

/**
 * Account (Figma 4496:10455): the profile card, the Commute Statistics, and General: Account
 * settings and Logout, which asks first. The toolbar at the foot marks Account; Record goes back
 * to Start, History opens History.
 */
export function AccountScreen({
  name,
  email,
  stats,
  unsentCount,
  isLoggingOut,
  error,
  onOpenHistory,
  onOpenSettings,
  onLogout,
  onOpenRecord,
}: AccountScreenProps) {
  const headingRef = useFocusHeading();
  const [isLogoutAsked, setIsLogoutAsked] = useState(false);
  const logoutRef = useRef<HTMLButtonElement>(null);
  // Back on the Logout row once the page is live again: it was inert under the question.
  const handleLogoutCancel = () => {
    flushSync(() => setIsLogoutAsked(false));
    logoutRef.current?.focus();
  };

  return (
    <section
      aria-labelledby="account-heading"
      className="absolute inset-0 z-20 bg-surface font-sn-pro text-content-primary"
    >
      <div inert={isLogoutAsked} className="absolute inset-0">
        <div className="flex h-full flex-col gap-8 overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+2rem)] pb-40">
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
                onClick={() => setIsLogoutAsked(true)}
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
        {/* The toolbar over the page's foot, the page fading out under it (4514:23035). */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-b from-transparent to-surface px-4 pt-6 pb-[max(3rem,env(safe-area-inset-bottom))] *:pointer-events-auto">
          <BottomToolbar
            current="account"
            onOpenRecord={onOpenRecord}
            onOpenHistory={onOpenHistory}
          />
        </div>
      </div>
      {isLogoutAsked && (
        <LogoutSheet
          unsentCount={unsentCount}
          isLoggingOut={isLoggingOut}
          onLogout={onLogout}
          error={error}
          onCancel={handleLogoutCancel}
        />
      )}
    </section>
  );
}
