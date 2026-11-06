import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ModeFilterCard } from './mode-filter-card';

/** Opens the card as the sliders would, and keeps the choice, so a story can be tapped through. */
function Opened(props: Omit<ComponentProps<typeof ModeFilterCard>, 'ref' | 'id'>) {
  const ref = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState(props.filter);
  // The page's own popover opens from outside React: the story stands in for the sliders.
  useEffect(() => ref.current?.showPopover(), []);
  return (
    <ModeFilterCard
      id="mode-filter-story"
      ref={ref}
      filter={filter}
      onFilter={(next) => {
        props.onFilter(next);
        setFilter(next);
      }}
    />
  );
}

const meta = {
  title: 'Features/Routes/ModeFilterCard',
  component: Opened,
  args: { filter: 'all', onFilter: fn() },
} satisfies Meta<typeof Opened>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Open, every route listed: All chosen. */
export const AllRoutes: Story = {};

/** Open with Jeep chosen. */
export const JeepChosen: Story = { args: { filter: 'jeep' } };

/** A choice applies at once and closes the card. */
export const ChoiceCloses: Story = {
  play: async ({ args, canvasElement }) => {
    const card = within(canvasElement.ownerDocument.body).getByTestId('mode-filter');
    await userEvent.click(within(card).getByRole('radio', { name: 'Ferry' }));
    await expect(args.onFilter).toHaveBeenCalledWith('ferry');
    await expect(card).not.toBeVisible();
  },
};
