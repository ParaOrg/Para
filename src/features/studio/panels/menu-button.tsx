import { useId, useState, type ReactNode } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';
import { cn } from '@/shared/utils/cn';

import { useNewMenu } from './use-new-menu';

/** One choice in a MenuButton's menu. */
export interface MenuChoice {
  id: string;
  label: string;
  /** Destructive words, in Content/error. */
  isDestructive?: boolean;
}

interface MenuButtonProps {
  /** What the button says to a screen reader and in its tooltip. */
  label: string;
  icon: ReactNode;
  /** Special, on its surface (Export), or Plain, the icon alone (⋮). */
  variant: 'special' | 'plain';
  choices: readonly MenuChoice[];
  /** A choice picked: the menu has closed and focus is back on the button. */
  onChoose: (id: string) => void;
  disabled?: boolean;
}

// Each voice at Small, as IconButton's own pairs name them.
const VOICE = {
  special: { variant: 'special', size: 'small' },
  plain: { variant: 'plain', size: 'small' },
} as const;

const WORDS = {
  default: 'text-content-primary',
  destructive: 'text-content-error',
} satisfies Record<'default' | 'destructive', string>;

/**
 * A small icon button that opens a menu under it, right-aligned: the route line detail's Export
 * and ⋮. The menu wears the New menu's look (new-menu.tsx), a placeholder until the owner draws
 * one, and keeps its keyboard (useNewMenu): the arrows, Home and End move, Escape closes and
 * hands focus back. A pick closes it and hands focus back to the button too.
 */
export function MenuButton({
  label,
  icon,
  variant,
  choices,
  onChoose,
  disabled = false,
}: MenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const { rootRef, triggerRef, menuRef, handleMenuKeyDown } = useNewMenu(isOpen, setIsOpen);
  const handleChoose = (id: string) => {
    setIsOpen(false);
    triggerRef.current?.focus();
    onChoose(id);
  };
  return (
    <div ref={rootRef} className="relative">
      <IconButton
        ref={triggerRef}
        {...VOICE[variant]}
        icon={icon}
        label={label}
        tooltip="top"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((was) => !was)}
      />
      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          tabIndex={-1}
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className="absolute top-full right-0 z-30 mt-1 flex w-48 flex-col gap-1 rounded-2xl bg-surface p-1.5 shadow-sm"
        >
          {choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              role="menuitem"
              onClick={() => handleChoose(choice.id)}
              className={cn(
                'flex w-full rounded-xl p-2 text-left font-sn-pro text-sm/5 font-semibold hover:bg-surface-secondary focus-visible:bg-surface-secondary',
                WORDS[choice.isDestructive ? 'destructive' : 'default'],
              )}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
