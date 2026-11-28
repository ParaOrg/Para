import { useId, useState, type ReactNode } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';

import { MenuList, type MenuChoice } from './menu-list';
import { useNewMenu } from './use-new-menu';

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
        <MenuList
          ref={menuRef}
          id={menuId}
          label={label}
          choices={choices}
          align="right"
          onChoose={handleChoose}
          onKeyDown={handleMenuKeyDown}
        />
      )}
    </div>
  );
}
