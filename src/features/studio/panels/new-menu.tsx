import { useId } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';
import { cn } from '@/shared/utils/cn';

import { CHOICES, type NewChoice } from './new-menu-choices';
import { AddIcon } from './new-menu-icons';
import { useNewMenu } from './use-new-menu';
import type { HotspotKind } from '../drawing/drawing-types';

/**
 * What the + takes from the map's corner, for the locator's controls to
 * stand on (`--dock-foot`): its 2.5rem off the foot, clear of the map's ⓘ as
 * the controls are, and its 3rem. The workshop sets it while the menu shows.
 */
export const NEW_MENU_DOCK_FOOT = '[--dock-foot:5.5rem]';

interface NewMenuProps {
  /** Whether the map is there to draw on. */
  isReady: boolean;
  /** Owned by the workshop, which keeps it while the menu is away (a drawing, the list). */
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onNewRoute: () => void;
  /** Start from an OSM route (.scratch/osm-route-start); without it, the choice is not offered. */
  onNewFromOsm?: () => void;
  /** Start from an old Para route (.scratch/old-para-routes); without it, not offered. */
  onNewFromOldPara?: () => void;
  onNewHotspot: (kind: HotspotKind) => void;
}

/**
 * The studio's one way to start, at the map's bottom right (Figma 4300:20889):
 * a Brand + under the locator's controls that opens LineSelection
 * (4304:21611) beside it — a route, a terminal or a hintuan. Disabled until the map is there to draw on.
 */
export function NewMenu({
  isReady,
  isOpen,
  onOpenChange,
  onNewRoute,
  onNewFromOsm,
  onNewFromOldPara,
  onNewHotspot,
}: NewMenuProps) {
  const menuId = useId();
  const { rootRef, triggerRef, menuRef, handleMenuKeyDown } = useNewMenu(isOpen, onOpenChange);
  // The "start from" choices, each offered only when its handler is given.
  const startFrom: Partial<Record<NewChoice, () => void>> = {
    osm: onNewFromOsm,
    'old-para': onNewFromOldPara,
  };
  const isOffered = (choice: NewChoice) => !(choice in startFrom) || !!startFrom[choice];

  const handleChoose = (choice: NewChoice) => {
    onOpenChange(false);
    if (choice === 'route') onNewRoute();
    else if (choice === 'osm' || choice === 'old-para') startFrom[choice]?.();
    else onNewHotspot(choice);
  };

  return (
    <div
      ref={rootRef}
      className="absolute right-[calc(0.75rem+env(safe-area-inset-right))] bottom-[calc(2.5rem+env(safe-area-inset-bottom))] z-10 flex items-end gap-3"
    >
      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          tabIndex={-1}
          aria-label="New"
          onKeyDown={handleMenuKeyDown}
          className="flex w-80 max-w-[calc(100cqw-5.25rem)] flex-col gap-1 rounded-2xl bg-surface p-1.5 shadow-sm"
        >
          {CHOICES.filter(({ choice }) => isOffered(choice)).map(
            ({ choice, title, description, icon, iconClassName }) => (
              <button
                key={choice}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => handleChoose(choice)}
                className="flex w-full flex-col rounded-xl p-2 text-left font-sn-pro text-sm/5 hover:bg-surface-secondary focus-visible:bg-surface-secondary"
              >
                <span className="flex w-full items-center gap-1">
                  <span aria-hidden className={cn('size-5 shrink-0 *:size-full', iconClassName)}>
                    {icon}
                  </span>
                  <span className="flex-1 font-semibold text-content-primary">{title}</span>
                </span>
                <span className="text-content-tertiary">{description}</span>
              </button>
            ),
          )}
        </div>
      )}
      <IconButton
        ref={triggerRef}
        variant="brand"
        size="large"
        icon={<AddIcon />}
        label="New route, terminal or hintuan"
        tooltip="bottom"
        disabled={!isReady}
        onClick={() => onOpenChange(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
      />
    </div>
  );
}
