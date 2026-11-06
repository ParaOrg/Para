import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState, type ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ModeFilterCard } from './mode-filter-card';

/**
 * A plain button stands in for the Controller's sliders, opening the card the same way
 * (popoverTarget); the choice is kept, so a story can be tapped through.
 */
function Opened(props: Omit<ComponentProps<typeof ModeFilterCard>, 'ref' | 'id'>) {
  const ref = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState(props.filter);
  return (
    <>
      <button type="button" popoverTarget="mode-filter-story">
        Open the filter
      </button>
      <ModeFilterCard
        id="mode-filter-story"
        ref={ref}
        filter={filter}
        onFilter={(next) => {
          props.onFilter(next);
          setFilter(next);
        }}
      />
    </>
  );
}

/** Opens the card as a tap on the sliders does. */
const open = async (canvasElement: HTMLElement) => {
  await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open the filter' }));
  return within(canvasElement.ownerDocument.body).getByTestId('mode-filter');
};

const meta = {
  title: 'Features/Routes/ModeFilterCard',
  component: Opened,
  args: { filter: 'all', onFilter: fn() },
} satisfies Meta<typeof Opened>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Open, every route listed: All chosen. */
export const AllRoutes: Story = {
  play: async ({ canvasElement }) => void (await open(canvasElement)),
};

/** Open with Jeep chosen. */
export const JeepChosen: Story = {
  args: { filter: 'jeep' },
  play: async ({ canvasElement }) => {
    const card = await open(canvasElement);
    await expect(within(card).getByRole('radio', { name: 'Jeep' })).toBeChecked();
  },
};

/** A choice applies at once and closes the card. */
export const ChoiceCloses: Story = {
  play: async ({ args, canvasElement }) => {
    const card = await open(canvasElement);
    await userEvent.click(within(card).getByRole('radio', { name: 'Ferry' }));
    await expect(args.onFilter).toHaveBeenCalledWith('ferry');
    await expect(card).not.toBeVisible();
  },
};

/** The arrow keys move through the choices, each applying, and leave the card open; Enter closes it. */
export const ArrowsMove: Story = {
  play: async ({ args, canvasElement }) => {
    const card = await open(canvasElement);
    within(card).getByRole('radio', { name: 'All' }).focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect(args.onFilter).toHaveBeenLastCalledWith('ejeep');
    await expect(card).toBeVisible();
    await userEvent.keyboard('{Enter}');
    await expect(card).not.toBeVisible();
  },
};
