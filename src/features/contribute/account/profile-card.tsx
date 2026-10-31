import './account-icons.css';

interface ProfileCardProps {
  /** The contributor's name, or null while it loads. */
  name: string | null;
  email: string;
}

/**
 * The Account page's top card (Figma 4506:19837): the account icon in its circle, and beside it
 * the name and the email the account signs in with.
 */
export function ProfileCard({ name, email }: ProfileCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-3xl bg-surface p-4 font-sn-pro shadow-large">
      <span className="grid size-16 shrink-0 place-items-center rounded-full bg-surface-tertiary opacity-60">
        <span
          aria-hidden
          className="account-icon account-icon-person size-10 text-content-tertiary"
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        {name === null ? (
          <span aria-hidden className="my-1 h-6 w-32 rounded-full bg-surface-tertiary" />
        ) : (
          <p className="text-2xl/8 font-semibold break-words text-content-primary">{name}</p>
        )}
        <p className="text-sm/5 break-words text-content-tertiary">{email}</p>
      </div>
    </div>
  );
}
