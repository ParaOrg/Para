import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { cn } from '@/shared/utils/cn';

import { DestinationRow } from './destination-row';
import { RouteBadge } from './route-badge';
import { LIVERIES, type Livery } from '../model/liveries';

/**
 * The card fills the rows sit on in Figma's RouteCardStackedList (4633:19780), for these stories
 * only: RouteCard itself moves to them in its own change. E-jeep's card has no fill among the new
 * semantics, so it keeps its old one.
 */
const CARD_FILL = {
  jeep: 'bg-card-jeep-fill',
  'uv-express': 'bg-card-uv-express-fill',
  ejeep: 'bg-card-ejeep-surface',
  bus: 'bg-card-bus-fill',
  'light-rail-way-one': 'bg-card-lrt-one-fill',
  'light-rail-way-two': 'bg-card-lrt-two-fill',
  'metro-rail-way-three': 'bg-card-mrt-three-fill',
  ferry: 'bg-card-ferry-fill',
} satisfies Record<Livery, string>;

/**
 * Figma's Destinationn (4794:20296): on a RouteCard in its livery, and on the sheet's surface in
 * the detail's list of more destinations (MiddleContent, 4795:20406). Pressed is `:active`: hold a
 * row to see it.
 */
const meta = {
  title: 'Features/Routes/DestinationRow',
  component: DestinationRow,
  args: { destination: 'SM Fairview', livery: 'jeep', on: 'card', onClick: fn() },
  decorators: [
    // A story that draws its own card (parameters.ownCard) is left unwrapped.
    (Story, { args, parameters }) =>
      parameters.ownCard === true ? (
        <Story />
      ) : (
        <div
          className={cn(
            'w-98.25',
            args.on === 'surface' ? 'bg-bg-surface' : CARD_FILL[args.livery],
          )}
        >
          <Story />
        </div>
      ),
  ],
} satisfies Meta<typeof DestinationRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On a jeep card: the place alone, 38 tall; a tap calls onClick. */
export const OnCard: Story = {
  play: async ({ canvasElement, args }) => {
    const row = within(canvasElement).getByRole('button', { name: 'SM Fairview' });
    await expect(row.getBoundingClientRect().height).toBe(38);
    await userEvent.click(row);
    await expect(args.onClick).toHaveBeenCalled();
  },
};

/** A route's via under its place, as Bagong Silang Phase 5's card draws it: 58 tall. */
export const OnCardWithVia: Story = {
  args: { additionalNotes: 'Via Maligaya' },
  play: async ({ canvasElement }) => {
    const row = within(canvasElement).getByRole('button', { name: 'SM Fairview , Via Maligaya' });
    await expect(row.getBoundingClientRect().height).toBe(58);
  },
};

/** Pressed on a jeep card, forced: the row takes the card's pressed colour, as today. */
export const OnCardPressed: Story = {
  args: { additionalNotes: 'Via Maligaya', className: 'bg-card-jeep-surface-secondary' },
};

/** Pressed on a light card (UV Express), forced, as today. */
export const OnLightCardPressed: Story = {
  args: {
    livery: 'uv-express',
    destination: 'Quiapo, Buendia',
    className: 'bg-card-uv-express-surface-secondary',
  },
};

/** A light card (UV Express): the arrow and words take Text/primary. */
export const OnLightCard: Story = {
  args: { livery: 'uv-express', destination: 'Quiapo, Buendia', additionalNotes: 'Via España' },
};

/** A train card's row: the station's code in the ❄️ Slot, after the place. */
export const OnRailCardWithSlot: Story = {
  args: {
    livery: 'light-rail-way-two',
    destination: 'Antipolo',
    slot: <RouteBadge label="PL13" livery="light-rail-way-two" />,
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('button', { name: 'Antipolo , PL13' }),
    ).toBeTruthy();
  },
};

/** MRT-3's yellow: dark words, and its code in the slot. */
export const OnMrtCard: Story = {
  args: {
    livery: 'metro-rail-way-three',
    destination: 'Taft Avenue',
    slot: <RouteBadge label="YL13" livery="metro-rail-way-three" />,
  },
};

/** A long place and a long via wrap under themselves; the slot stays beside the place. */
export const LongName: Story = {
  args: {
    destination: 'Bagong Silang Kanan 5 Phase 3 Package 2 Terminal',
    additionalNotes: 'Via Quirino Highway, Regalado Avenue and Commonwealth Avenue',
  },
};

/** On the surface, in the detail's list: Text/primary words, the arrow in the jeep's fill. */
export const OnSurface: Story = {
  args: { on: 'surface', additionalNotes: 'Via Maligaya' },
};

/** Pressed on the surface, forced: the grey pill, as today. */
export const OnSurfacePressed: Story = {
  args: { on: 'surface', additionalNotes: 'Via Maligaya', className: 'bg-surface-tertiary' },
};

/** On the surface for each mode: the arrow wears its mode's card fill where it reaches 3:1, else Text/primary. */
export const OnSurfaceEachMode: Story = {
  args: { on: 'surface' },
  render: (args) => (
    <div className="flex flex-col">
      {LIVERIES.map((livery) => (
        <DestinationRow key={livery} {...args} livery={livery} destination={livery} />
      ))}
    </div>
  ),
};

/** Every card the rows sit on, with a via, as the list stacks them. */
export const OnEachCard: Story = {
  parameters: { ownCard: true },
  render: (args) => (
    <div className="flex flex-col">
      {LIVERIES.map((livery) => (
        <div key={livery} className={CARD_FILL[livery]}>
          <DestinationRow
            {...args}
            livery={livery}
            destination={livery}
            additionalNotes="Via Maligaya"
          />
        </div>
      ))}
    </div>
  ),
};

/** At a phone's width: a 320-wide card, a long place and its via wrapping inside it. */
export const Phone: Story = {
  args: {
    destination: 'Novaliches Bayan via Quirino Highway Terminal',
    additionalNotes: 'Via Almar',
  },
  parameters: { ownCard: true },
  render: (args) => (
    <div className={cn('@container w-80', CARD_FILL[args.livery])}>
      <DestinationRow {...args} />
    </div>
  ),
};
