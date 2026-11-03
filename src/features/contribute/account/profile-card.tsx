import { cn } from '@/shared/utils/cn';

import { Skeleton } from '../common/skeleton';
import { useIsSlowLoad } from '../common/use-is-slow-load';

import './account-icons.css';

interface ProfileCardProps {
  /** The contributor's name, or null while it loads. */
  name: string | null;
  email: string;
}

/**
 * The Account page's top card (Figma 4506:19837): the account icon in its circle, and beside it
 * the name and the email the account signs in with. While the name loads, the circle and the
 * name's line shimmer in their places, once the wait is long enough to see.
 */
export function ProfileCard({ name, email }: ProfileCardProps) {
  const isLoading = name === null;
  const isSkeletonShown = useIsSlowLoad(isLoading);
  return (
    <div
      aria-busy={isLoading || undefined}
      className="flex items-center gap-4 rounded-3xl bg-surface p-4 font-sn-pro shadow-large"
    >
      <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-tertiary opacity-60">
        <span
          aria-hidden
          className={cn(
            'account-icon account-icon-person size-10 text-content-tertiary',
            isLoading && 'invisible',
          )}
        />
        {isLoading && (
          <Skeleton isShown={isSkeletonShown} className="absolute inset-0 rounded-full" />
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        {name === null ? (
          <>
            <p className="sr-only">Loading your account</p>
            <span className="flex h-8 items-center">
              <Skeleton isShown={isSkeletonShown} className="h-6 w-32 rounded-full" />
            </span>
          </>
        ) : (
          <p className="text-2xl/8 font-semibold break-words text-content-primary">{name}</p>
        )}
        <p className="text-sm/5 break-words text-content-tertiary">{email}</p>
      </div>
    </div>
  );
}
