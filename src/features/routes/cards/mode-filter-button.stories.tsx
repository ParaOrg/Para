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
  /** Which funnel and size: the map's Large (28) or the Controller's Base with the 28 drawing. */
  isLarge: boolean;
  /** The IconButton's size. */
  size?: 'base' | 'large';
}

/** Keeps the filter as the apps do, so a story can be tapped through. */
function Keeping({ filter: startsOn, onFilter, isLarge, size }: KeepingProps) {
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
      size={size}
    />
  );
}

/** The funnel on the map's grey, where it floats over the route list (4633:21371). */
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

/** Every route shown: "Filter", no badge. A tap opens the card; a choice applies, closes it and counts 1. */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Filter' }));
    const card = within(canvasElement.ownerDocument.body).getByTestId('mode-filter');
    await userEvent.click(within(card).getByText('Jeep'));
    await expect(args.onFilter).toHaveBeenCalledWith('jeep');
    await waitFor(() => expect(card).not.toBeVisible());
    await expect(canvas.getByRole('button', { name: 'Filter: Jeep' })).toBeInTheDocument();
    await expect(canvas.getByText('1')).toBeVisible();
  },
};

/** A filter on: the count of modes picked, and the name says which, so the badge is not the only sign. */
export const Filtered: Story = {
  args: { filter: 'bus' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Filter: Bus' })).toBeInTheDocument();
    await expect(canvas.getByText('1')).toBeVisible();
  },
};

/** All: no badge at all. */
export const NoneFiltered: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByText('0')).toBeNull();
  },
};

/** Large (48) with the 28 funnel, as the Figma draws the commuter map's corner (4885:42133); the page places it. */
export const LargeFiltered: Story = { args: { filter: 'jeep', size: 'large', isLarge: true } };

/** The studio's Controller's funnel: the same button, its 28 drawing. */
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
