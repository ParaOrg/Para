import { cn } from '@/shared/utils/cn';

/** The questions a card asks before a delete, each its own. */
export type Asking = 'delete-from-para' | 'remove-from-phone' | null;

/** Which of the card's actions apply to its recording: the menu shows only those. */
export interface CardActions {
  /** Kept back, or taken off Para: it can be sent from here. */
  canUpload: boolean;
  /** On this phone, so there is a copy to remove. */
  isOnPhone: boolean;
  /** Uploaded under this account, so it can be deleted from Para. */
  canDeleteFromPara: boolean;
  /** Mid-upload or mid-removal (or its person check): taking it off the phone would cut that short. */
  isBusy: boolean;
}

/** Whether the menu has anything in it: a card with nothing to do shows no ⋮. */
export const hasMenuItems = ({
  canUpload,
  isOnPhone,
  canDeleteFromPara,
  isBusy,
}: CardActions): boolean => canUpload || (isOnPhone && !isBusy) || canDeleteFromPara;

interface CardMenuProps {
  actions: CardActions;
  /** The card's recording in words, so each item's name says which one it acts on. */
  fullName: string;
  /** The id the card's ⋮ controls. */
  menuId: string;
  onUpload: () => void;
  onAsk: (question: Exclude<Asking, null>) => void;
}

interface MenuItem {
  key: string;
  label: string;
  isDestructive: boolean;
  onSelect: () => void;
}

/**
 * The card's ⋮ menu: only the actions that apply, the deletes in red and each asked first. Shown
 * under the ⋮, over the cards below. TODO: Figma draws no menu yet; restyle once the owner does.
 */
export function CardMenu({ actions, fullName, menuId, onUpload, onAsk }: CardMenuProps) {
  const items: MenuItem[] = [
    ...(actions.canUpload
      ? [{ key: 'upload', label: 'Upload to Para', isDestructive: false, onSelect: onUpload }]
      : []),
    ...(actions.canDeleteFromPara
      ? [
          {
            key: 'delete',
            label: 'Delete from Para',
            isDestructive: true,
            onSelect: () => onAsk('delete-from-para'),
          },
        ]
      : []),
    ...(actions.isOnPhone && !actions.isBusy
      ? [
          {
            key: 'remove',
            label: 'Remove from this phone',
            isDestructive: true,
            onSelect: () => onAsk('remove-from-phone'),
          },
        ]
      : []),
  ];

  return (
    <ul
      id={menuId}
      className="absolute top-full right-0 z-10 mt-1 flex min-w-56 flex-col rounded-xl bg-surface py-1 shadow-sm"
    >
      {items.map((item) => (
        <li key={item.key}>
          <button
            type="button"
            aria-label={`${item.label}, ${fullName}`}
            onClick={item.onSelect}
            className={cn(
              'w-full px-4 py-3 text-left text-sm/5 hover:bg-surface-secondary focus-visible:bg-surface-secondary',
              item.isDestructive ? 'text-content-error' : 'text-content-primary',
            )}
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
