import { useId } from 'react';
import type { ReactNode } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';
import { HintuanIcon, RoutesIcon, TerminalIcon } from '@/shared/ui/route-icons';

import { useNewMenu } from './use-new-menu';
import type { HotspotKind } from '../drawing/drawing-types';

type NewChoice = 'route' | HotspotKind;

interface Choice {
  choice: NewChoice;
  title: string;
  description: string;
  icon: ReactNode;
  /** Figma draws each letter disc in its own colour: blue-700, sky-700, green-700. */
  iconClassName: string;
}

const CHOICES: Choice[] = [
  {
    choice: 'route',
    title: 'Routes',
    description: 'Lines you can ride by jeep, e-jeep, UV Express or bus.',
    icon: <RoutesIcon />,
    iconClassName: 'text-blue-700',
  },
  {
    choice: 'terminal',
    title: 'Terminal',
    description: 'Where rides start, wait and fill up with passengers.',
    icon: <TerminalIcon />,
    iconClassName: 'text-sky-700',
  },
  {
    choice: 'hintuan',
    title: 'Hintuan',
    description: 'Places along the way where you can wait and get on.',
    icon: <HintuanIcon />,
    iconClassName: 'text-green-700',
  },
];

interface NewMenuProps {
  /** Whether the map is there to draw on. */
  isReady: boolean;
  /** Owned by the workshop, which keeps it while the menu is away (a drawing, the list). */
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onNewRoute: () => void;
  onNewHotspot: (kind: HotspotKind) => void;
}

/**
 * The studio's one way to start, at the map's bottom right (Figma 4300:20889):
 * a Brand + that opens LineSelection (4304:21611) beside it — a route, a
 * terminal or a hintuan. Disabled until the map is there to draw on.
 */
export function NewMenu({ isReady, isOpen, onOpenChange, onNewRoute, onNewHotspot }: NewMenuProps) {
  const menuId = useId();
  const { rootRef, triggerRef, menuRef, handleMenuKeyDown } = useNewMenu(isOpen, onOpenChange);

  const handleChoose = (choice: NewChoice) => {
    onOpenChange(false);
    if (choice === 'route') onNewRoute();
    else onNewHotspot(choice);
  };

  return (
    <div
      ref={rootRef}
      className="absolute right-[calc(1.25rem+env(safe-area-inset-right))] bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-10 flex items-end gap-3"
    >
      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          tabIndex={-1}
          aria-label="New"
          onKeyDown={handleMenuKeyDown}
          className="flex w-80 max-w-[calc(100vw-6rem)] flex-col gap-1 rounded-2xl bg-surface p-1.5 shadow-sm"
        >
          {CHOICES.map(({ choice, title, description, icon, iconClassName }) => (
            <button
              key={choice}
              type="button"
              role="menuitem"
              onClick={() => handleChoose(choice)}
              className="flex w-full flex-col rounded-xl p-2 text-left font-sn-pro text-sm/5 hover:bg-surface-secondary focus-visible:bg-surface-secondary"
            >
              <span className="flex w-full items-center gap-1">
                <span aria-hidden className={'size-5 shrink-0 *:size-full ' + iconClassName}>
                  {icon}
                </span>
                <span className="flex-1 font-semibold text-content-primary">{title}</span>
              </span>
              <span className="text-content-tertiary">{description}</span>
            </button>
          ))}
        </div>
      )}
      <IconButton
        ref={triggerRef}
        variant="brand"
        size="large"
        icon={<AddIcon />}
        label="New route, terminal or hintuan"
        tooltip="right"
        disabled={!isReady}
        onClick={() => onOpenChange(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
      />
    </div>
  );
}

/** Figma's add, 28 across (4300:20976). */
function AddIcon() {
  return (
    <svg viewBox="0 0 28 28" fill="currentColor" aria-hidden>
      <path d="M12.9507 22.169V15.0528H5.83331C5.25341 15.0528 4.78285 14.5822 4.78285 14.0023C4.78286 13.4224 5.25342 12.9519 5.83331 12.9519H12.9507V5.83337C12.9507 5.25349 13.4212 4.78294 14.0011 4.78291C14.581 4.78291 15.0516 5.25347 15.0516 5.83337V12.9519H22.1689C22.7488 12.9519 23.2194 13.4224 23.2194 14.0023C23.2194 14.5822 22.7488 15.0528 22.1689 15.0528H15.0516V22.169C15.0516 22.7489 14.581 23.2194 14.0011 23.2194C13.4212 23.2194 12.9507 22.7489 12.9507 22.169Z" />
    </svg>
  );
}
