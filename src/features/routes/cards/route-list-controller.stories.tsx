import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { RouteListController } from './route-list-controller';
import { LIVERIES } from '../model/liveries';
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
    owner: 'chooser',
    way: 'Papunta',
    isSwitchable: true,
    isBack: false,
    onSwitch: fn(),
    filter: 'all',
    onFilter: fn(),
    onClose: fn(),
  },
  parameters: { layout: 'fullscreen' },
  // A phone's foot, 393 wide, over a card's white, as the bar floats over what scrolls under it.
  decorators: [
    (Story) => (
      <div data-floats="dock" className="@container w-98.25 bg-surface pt-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Filtering>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The list on a phone (4679:23737): ✕, PAPUNTA in the middle, the sliders, over the fade. */
export const Phone: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const way = canvas.getByTestId('chooser-flip');
    // The capitals are the type's: its name is the word as written.
    await expect(way).toHaveAccessibleName('Papunta');
    await expect(getComputedStyle(way).textTransform).toBe('uppercase');
    await expect(getComputedStyle(way).fontSize).toBe('17px');
    await expect(getComputedStyle(way).fontWeight).toBe('700');
    await userEvent.click(way);
    await expect(args.onSwitch).toHaveBeenCalledTimes(1);
    // PAPUNTA stands in the bar's middle.
    const bar = canvas.getByTestId('chooser-controller').getBoundingClientRect();
    const box = way.getBoundingClientRect();
    await expect(Math.abs(box.left + box.width / 2 - (bar.left + bar.width / 2))).toBeLessThan(1);
  },
};

/** A trip on a phone: ‹, for something is behind it, and no ✕; the slot after PAPUNTA empty. */
export const TripPhone: Story = {
  args: { owner: 'card', filter: null, onBack: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('button', { name: 'Close' })).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
    await expect(args.onBack).toHaveBeenCalledTimes(1);
    await expect(canvas.getByTestId('card-switch')).toBeVisible();
  },
};

/** Figma's extra slot, after PAPUNTA: what is to come there, here a stand-in. */
export const ExtraSlot: Story = {
  args: {
    owner: 'card',
    filter: null,
    onBack: fn(),
    extra: <span className="size-10 rounded-full bg-surface-tertiary" />,
  },
};

/** The way back showing: PAPUNTA reads Pabalik. */
export const Back: Story = { args: { way: 'Pabalik', isBack: true } };

/** A train: its bound. */
export const Bound: Story = { args: { way: 'Southbound' } };

/** Nothing drawn the other way round: PAPUNTA rests disabled. */
export const NotSwitchable: Story = {
  args: { isSwitchable: false },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('chooser-flip')).toBeDisabled();
  },
};

/** Only loops listed: they have no way back, so no PAPUNTA. */
export const LoopsOnly: Story = {
  args: { way: null },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId('chooser-flip')).toBeNull();
  },
};

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

/** No filter kept by the caller: no sliders, ✕ and PAPUNTA alone. */
export const NoFilter: Story = { args: { filter: null } };

/** Where the sheet floats (a map 64rem wide), only the bar's first 384 shown, as the list's. */
const wide: Decorator[] = [
  (Story) => (
    <div data-floats="dock" className="@container w-5xl bg-surface-quaternary">
      <div className="w-96">
        <Story />
      </div>
    </div>
  ),
];

/**
 * The list on a wide screen (4683:32635): the top bar, 64 tall, brand blue; ⇆ PAPUNTA and the
 * sliders at the left in Brand/surface, ✕ at the right.
 */
export const Wide: Story = {
  decorators: wide,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bar = canvas.getByTestId('chooser-controller');
    await expect(bar.getBoundingClientRect().height).toBe(64);
    const close = canvas.getByRole('button', { name: 'Close' }).getBoundingClientRect();
    const way = canvas.getByTestId('chooser-flip').getBoundingClientRect();
    await expect(close.left).toBeGreaterThan(way.right);
  },
};

/** A trip on a wide screen: the bar in the trip's colour, ‹ at the right. */
export const WideTrip: Story = {
  args: { owner: 'card', filter: null, livery: 'jeep', onBack: fn() },
  decorators: wide,
};

/** Every livery's bar, as a trip wears it. */
export const WideLiveries: Story = {
  args: { owner: 'card', filter: null },
  decorators: wide,
  render: (args) => (
    <div className="flex flex-col gap-2">
      {LIVERIES.map((livery) => (
        <Filtering key={livery} {...args} livery={livery} />
      ))}
    </div>
  ),
};
