import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { FilterIcon } from '@/shared/ui/map-control-icons';
import { FilterLargeIcon } from '@/shared/ui/route-icons';

import { ModeFilterButton } from './mode-filter-button';
import type { ModeFilter } from '../model/mode-filter';

interface KeepingProps {
  /** The filter it starts on. */
  filter: ModeFilter;
  onFilter: (filter: ModeFilter) => void;
  /** Which sliders: the map's (Figma's filter) or the studio's Controller's (filter-large). */
  isLarge: boolean;
}

/** Keeps the filter as the apps do, so a story can be tapped through. */
function Keeping({ filter: startsOn, onFilter, isLarge }: KeepingProps) {
  const [filter, setFilter] = useState(startsOn);
  return (
    <ModeFilterButton
      modeFilter={{
        filter,
        onFilter: (next) => {
          onFilter(next);
          setFilter(next);
        },
      }}
      icon={isLarge ? <FilterLargeIcon /> : <FilterIcon />}
      tooltip="left"
      testId="chooser-filter"
    />
  );
}

/** The sliders on the map's grey, where they float over the route list (4831:51281). */
const meta = {
  title: 'Features/Routes/ModeFilterButton',
  component: Keeping,
  args: { filter: 'all', onFilter: fn(), isLarge: false },
  decorators: [
    (Story) => (
      <div className="flex bg-bg-surface-secondary p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Keeping>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every route shown: "Filter". A tap opens the card; a choice applies, closes it and dots the sliders. */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Filter' }));
    const card = within(canvasElement.ownerDocument.body).getByTestId('mode-filter');
    await userEvent.click(within(card).getByText('Jeep'));
    await expect(args.onFilter).toHaveBeenCalledWith('jeep');
    await waitFor(() => expect(card).not.toBeVisible());
    await expect(canvas.getByRole('button', { name: 'Filter: Jeep' })).toBeInTheDocument();
  },
};

/** A filter on: the dot on the sliders, and their name says which, so the dot is not the only sign. */
export const Filtered: Story = {
  args: { filter: 'bus' },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('button', { name: 'Filter: Bus' }),
    ).toBeInTheDocument();
  },
};

/** The studio's Controller's sliders: the same button, its larger drawing. */
export const OnTheController: Story = { args: { isLarge: true } };

/** On a phone's map, 393 wide, at the bottom left over the sheet, as the public map stands them. */
export const OnPhone: Story = {
  decorators: [
    (Story) => (
      <div className="@container relative h-60 w-98.25 overflow-hidden bg-bg-surface-secondary">
        <div className="absolute inset-x-0 bottom-0 h-24 rounded-t-3xl bg-bg-surface" />
        <div className="absolute bottom-27 left-4 flex">
          <Story />
        </div>
      </div>
    ),
  ],
};
