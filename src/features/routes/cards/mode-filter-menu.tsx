import { useEffect, useId, useRef, type KeyboardEvent, type MouseEvent } from 'react';

import { Button } from '@/design-system/primitives/button';
import { IconButton } from '@/design-system/primitives/icon-button';
import { Switch } from '@/design-system/primitives/switch';
import { CloseIcon } from '@/shared/ui/route-icons';

import { ModeFilterIcon } from './mode-filter-icon';
import {
  MODES,
  MODE_FILTER_LABEL,
  togglePick,
  type Mode,
  type ModePicks,
} from '../model/mode-filter';

interface ModeFilterMenuProps {
  picks: ModePicks;
  onPicks: (picks: ModePicks) => void;
  /** How many routes the list shows under the picks, for "Show 36 routes". */
  routeCount: number;
  onClose: () => void;
}

/**
 * The route list's filter (Figma 4896:42082; wide, 4896:43309): a sheet at the foot of a phone, a
 * card in the middle of a wide screen, over the dark scrim. A switch for each mode; several can be
 * on, and each applies as it is tapped, the list and the map following behind. Clear all lets them
 * all go (every route); "Show 36 routes" closes it, as ✕, a tap outside, Escape and Back do.
 * A modal dialog: the focus stays in it, and the button that opened it takes it back.
 */
export function ModeFilterMenu({ picks, onPicks, routeCount, onClose }: ModeFilterMenuProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  // Its own Escape, taken here: prevented, the route list behind it keeps open (isEscapeToClose).
  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    onClose();
  };
  // A tap on the scrim lands on the dialog itself; one on the sheet lands inside it.
  const handleClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };
  const handleToggle = (mode: Mode) => onPicks(togglePick(picks, mode));

  return (
    // Back on a phone closes it as the browser's own close request: `close` comes with no key.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the scrim's tap; the keyboard's Escape is handled with it
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      data-testid="mode-filter"
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      onClose={onClose}
      className="mx-0 mt-auto mb-0 w-full max-w-none overflow-clip rounded-t-4xl bg-surface p-0 font-sn-pro text-content-primary shadow-bottom-sheet-top-shadow backdrop:bg-surface-transparent lg:m-auto lg:w-[calc(100%-2rem)] lg:max-w-120 lg:rounded-4xl"
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <h2 id={titleId} className="text-lg/7 font-semibold">
          Filter
        </h2>
        <IconButton
          size="small"
          icon={<CloseIcon />}
          label="Close"
          tooltip="left"
          onClick={onClose}
        />
      </div>
      <ul className="flex flex-col px-5 pt-2 pb-4">
        {MODES.map((mode) => (
          <ModeRow
            key={mode}
            mode={mode}
            isOn={picks.includes(mode)}
            onToggle={() => handleToggle(mode)}
          />
        ))}
      </ul>
      <div className="flex items-center justify-between border-t-0-6 border-border-tertiary px-5 py-4">
        <Button variant="plain" label="Clear all" onClick={() => onPicks([])} />
        <Button
          variant="primary"
          label={`Show ${routeCount} ${routeCount === 1 ? 'route' : 'routes'}`}
          onClick={onClose}
        />
      </div>
    </dialog>
  );
}

interface ModeRowProps {
  mode: Mode;
  isOn: boolean;
  onToggle: () => void;
}

/** A mode's row: its drawing and name, and its switch, which the name labels. */
function ModeRow({ mode, isOn, onToggle }: ModeRowProps) {
  const nameId = useId();
  return (
    <li className="flex items-center justify-between gap-2 py-2.5">
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <ModeFilterIcon mode={mode} />
        <span id={nameId} className="text-base/6 font-medium">
          {MODE_FILTER_LABEL[mode]}
        </span>
      </span>
      <Switch state={isOn ? 'on' : 'rest'} labelledBy={nameId} onClick={onToggle} />
    </li>
  );
}
