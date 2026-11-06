import { useId, useRef, type KeyboardEvent, type RefObject } from 'react';

import { MODE_FILTER_LABEL, MODE_FILTERS, type ModeFilter } from '../model/mode-filter';

interface ModeFilterCardProps {
  /** The card's own id, for the filter button's popoverTarget. */
  id: string;
  /** The card itself, so a choice can close it. */
  ref: RefObject<HTMLDivElement | null>;
  filter: ModeFilter;
  onFilter: (filter: ModeFilter) => void;
}

/**
 * The route list's filter, opened by the Controller's sliders. Designed by the builder for now,
 * from the house's own parts, until the owner draws it: a card in the middle of the screen with the
 * Map Style card's surface and shadow, and one choice of All, Jeep, E-Jeep, Bus, LRT, MRT or Ferry.
 * Radio buttons, so the arrow keys move through them and a screen reader says how many there are.
 * A choice applies at once. A tap, Enter or Space on one closes the card; the arrow keys only move,
 * so a keyboard can reach Ferry without the card closing on the way. Escape or a tap outside
 * closes it too (the page's own popover, which also hands the focus back).
 */
export function ModeFilterCard({ id, ref, filter, onFilter }: ModeFilterCardProps) {
  // One radio group per card, so two lists' filters never share their choice.
  const groupName = useId();
  const close = () => ref.current?.hidePopover();
  // An arrow key checks the next radio and fires a click on it, as a tap on a choice or its words
  // does, and as Space and a screen reader's click do. Only the arrow keys' clicks leave it open.
  const isArrowMoveRef = useRef(false);
  const handleClick = () => {
    if (isArrowMoveRef.current) {
      isArrowMoveRef.current = false;
      return;
    }
    close();
  };
  // The arrow's click comes during its keydown: clear the mark by keyup, so a key that moved
  // nothing (an arrow held with Ctrl) cannot swallow the next tap.
  const handleKeyUp = () => {
    isArrowMoveRef.current = false;
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    isArrowMoveRef.current = event.key.startsWith('Arrow');
    // Radios do nothing on Enter, nor on Space once checked (no click comes), so those close the
    // card here. Space on another choice checks it, and its click closes the card.
    const isChosenAgain = event.key === ' ' && event.currentTarget.checked;
    if (event.key !== 'Enter' && !isChosenAgain) return;
    // Closing hands the focus back to the sliders; unprevented, the same Enter would press them
    // and open the card again.
    event.preventDefault();
    close();
  };
  return (
    <div
      ref={ref}
      id={id}
      popover="auto"
      data-testid="mode-filter"
      className="m-auto w-72 rounded-2xl bg-surface p-4 font-sn-pro text-content-primary shadow-sm backdrop:bg-surface-transparent"
    >
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-2 text-lg/7 font-extrabold">Show routes</legend>
        {MODE_FILTERS.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-base/6 font-medium has-checked:bg-surface-secondary has-focus-visible:outline-2 has-focus-visible:outline-brand-surface"
          >
            <input
              type="radio"
              name={groupName}
              value={option}
              checked={filter === option}
              onChange={() => onFilter(option)}
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              className="size-4 accent-brand-surface outline-none"
            />
            {MODE_FILTER_LABEL[option]}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
