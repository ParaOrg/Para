import { useId, type KeyboardEvent, type MouseEvent, type RefObject } from 'react';

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
  // An arrow key checks the next radio and fires a click with no pointer behind it (detail 0).
  const handleClick = (event: MouseEvent<HTMLInputElement>) => {
    if (event.detail > 0) close();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === ' ') close();
    if (event.key !== 'Enter') return;
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
              className="size-4 accent-brand-surface outline-none"
            />
            {MODE_FILTER_LABEL[option]}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
