import { useId, useState } from 'react';

import { cn } from '@/shared/utils/cn';

import { ADD_WAY_CHOICES, addWayOf, type AddWay } from './add-way';
import { MenuList } from './menu-list';
import { TAB, TAB_WORDS } from './tab-look';
import { useNewMenu } from './use-new-menu';

interface AddRouteMenuProps {
  /** A way picked: the menu has closed. */
  onChoose: (how: AddWay) => void;
}

/**
 * "+ Add route" on an undrawn direction's tab: a menu of how to add it — draw it by hand, or
 * start from an OSM route or an old Para route, the trigger in a resting tab's look. The menu is MenuButton's (menu-list.tsx), lined
 * up with the tab's left edge, with its keyboard (useNewMenu).
 */
export function AddRouteMenu({ onChoose }: AddRouteMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const { rootRef, triggerRef, menuRef, handleMenuKeyDown } = useNewMenu(isOpen, setIsOpen);
  const handleChoose = (id: string) => {
    setIsOpen(false);
    const how = addWayOf(id);
    if (how) onChoose(how);
  };
  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((was) => !was)}
        className={cn(TAB_WORDS, TAB.rest)}
      >
        + Add route
      </button>
      {isOpen && (
        <MenuList
          ref={menuRef}
          id={menuId}
          label="Add route"
          choices={ADD_WAY_CHOICES}
          align="left"
          onChoose={handleChoose}
          onKeyDown={handleMenuKeyDown}
        />
      )}
    </div>
  );
}
