import './account-icons.css';

interface ProfileCardProps {
  /** The contributor's name, or null while it loads. */
  name: string | null;
  email: string;
}

/**
 * The Account page's top card (Figma 4506:19835): the account icon in its circle, the name and
 * the email the account signs in with.
 */
export function ProfileCard({ name, email }: ProfileCardProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-4xl bg-surface px-4 py-4 font-sn-pro shadow-large">
      <span className="grid size-24 place-items-center rounded-full bg-surface-tertiary opacity-60">
        <span
          aria-hidden
          className="account-icon account-icon-person size-16 text-content-tertiary"
        />
      </span>
      <div className="flex w-full flex-col items-center text-center">
        {name === null ? (
          <span aria-hidden className="my-1 h-6 w-32 rounded-full bg-surface-tertiary" />
        ) : (
          <p className="w-full text-2xl/8 font-semibold break-words text-content-primary">{name}</p>
        )}
        <p className="w-full text-sm/5 break-words text-content-tertiary">{email}</p>
      </div>
    </div>
  );
}
