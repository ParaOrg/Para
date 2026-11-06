import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { RouteListController } from './route-list-controller';
import type { ModeFilter } from '../model/mode-filter';

interface FilteringProps extends Omit<ComponentProps<typeof RouteListController>, 'modeFilter'> {
  /** The filter it starts on; null: the caller keeps none, so no sliders. */
  filter: ModeFilter | null;
  onFilter: (filter: ModeFilter) => void;
}

/** Keeps the filter as the apps do, so a story can be tapped through. */
function Filtering({ filter: startsOn, onFilter, ...props }: FilteringProps) {
  const [filter, setFilter] = useState(startsOn ?? 'all');
  return (
    <RouteListController
      {...props}
      modeFilter={
        startsOn === null
          ? undefined
          : {
              filter,
              onFilter: (next) => {
                onFilter(next);
                setFilter(next);
              },
            }
      }
    />
  );
}

const meta = {
  title: 'Features/Routes/RouteListController',
  component: Filtering,
  args: {
    layout: 'row',
    way: 'Pabalik',
    isSwitchable: true,
    isBack: false,
    onSwitch: fn(),
    filter: 'all',
    onFilter: fn(),
    onClose: fn(),
  },
  decorators: [
    (Story, ctx) => (
      <div className={ctx.args.layout === 'row' ? 'w-98 bg-surface pt-8' : 'h-96 w-fit bg-surface'}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Filtering>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma's Default, along a phone sheet's foot (393 wide): ✕ at the left, ⇆ over the filter at the right. */
export const Row: Story = {};

/** Figma's Variant2, the column beside the list docked on a wide screen. */
export const Column: Story = { args: { layout: 'column' } };

/** The way back showing: ⇆ now leads to Papunta. */
export const Back: Story = { args: { way: 'Papunta', isBack: true } };

/** Nothing drawn the other way round: ⇆ rests disabled. */
export const NotSwitchable: Story = { args: { isSwitchable: false } };

/** Only loops listed: they have no way back, so no ⇆. */
export const LoopsOnly: Story = { args: { way: null } };

/** A filter on: a dot on the sliders, and its name says which. */
export const Filtered: Story = {
  args: { filter: 'jeep' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Filter: Jeep' })).toBeVisible();
  },
};

/**
 * Tapped through: the sliders open the filter, a choice applies and closes it, and the button's
 * name says which.
 */
export const PickAFilter: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Filter' }));
    const card = canvas.getByTestId('mode-filter');
    await expect(card).toBeVisible();
    await expect(within(card).getAllByRole('radio')).toHaveLength(7);
    await userEvent.click(within(card).getByRole('radio', { name: 'Bus' }));
    await expect(args.onFilter).toHaveBeenCalledWith('bus');
    await expect(card).not.toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Filter: Bus' })).toBeVisible();
  },
};

/** The column with a filter on, on a wide screen. */
export const ColumnFiltered: Story = { args: { layout: 'column', filter: 'lrt' } };

/** No filter kept by the caller: no sliders, ✕ and ⇆ alone. */
export const NoFilter: Story = { args: { filter: null } };

/**
 * `auto`, as the route list wears it: the row on a phone's sheet, and the column where the sheet
 * docks (`sheet-floating:`, a map 64rem wide). Each tooltip points inward, to fit in both.
 */
export const Auto: Story = {
  args: { layout: 'auto' },
  decorators: [
    (Story) => (
      <div className="flex flex-col gap-8">
        <div data-floats="dock" className="@container w-98 bg-surface pt-8">
          <Story />
        </div>
        <div data-floats="dock" className="@container h-96 w-5xl bg-surface-quaternary">
          <Story />
        </div>
      </div>
    ),
  ],
};
