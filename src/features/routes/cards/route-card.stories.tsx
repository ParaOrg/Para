import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { RouteCard } from './route-card';
import { LIVERIES } from '../model/liveries';

const meta = {
  title: 'Features/Routes/RouteCard',
  component: RouteCard,
  // As wide as the list in the top-left corner: the card fills whatever holds it.
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  args: {
    livery: 'red',
    state: 'rest',
    routeOrigin: 'Novaliches (Bayan)',
    endPoints: [{ id: 'a', routeDirection: 'Tala', vehicle: 'Jeepney' }],
    onSelect: fn(),
    onPick: fn(),
    testId: 'chooser',
  },
} satisfies Meta<typeof RouteCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Red: Content/inverse under Route/RouteCardPrimary, the Primary Blob. The
 * place in SN Pro Bold 24/32, as the RouteCard set draws it (3665:2265).
 */
export const Red: Story = {
  play: async ({ canvasElement }) => {
    const place = within(canvasElement).getByTestId('chooser-select');
    const type = getComputedStyle(place);
    await expect(type.fontSize).toBe('24px');
    await expect(type.lineHeight).toBe('32px');
    await expect(type.fontWeight).toBe('700');
  },
};

/** Orange, the Card/orange tokens. */
export const Orange: Story = { args: { livery: 'orange', routeOrigin: 'SM Fairview' } };

/** State=Selected, red: pressed in under Route/RouteCardPrimarySelected; nothing else changes. */
export const RedSelected: Story = { args: { state: 'selected' } };

/** Selected, orange: the same Primary shadow. */
export const OrangeSelected: Story = {
  args: { state: 'selected', livery: 'orange', routeOrigin: 'SM Fairview' },
};

/**
 * Violet: white words, as Red, under Route/RouteCardInverse's shadow and
 * Blob.
 */
export const Violet: Story = { args: { livery: 'violet', routeOrigin: 'Fairview' } };

/** Selected, violet: pressed in under Route/RouteCardInverseSelected. */
export const VioletSelected: Story = {
  args: { state: 'selected', livery: 'violet', routeOrigin: 'Fairview' },
};

/** Rose: as Violet. */
export const Rose: Story = { args: { livery: 'rose', routeOrigin: 'Novaliches' } };

/** Selected, rose: as Violet. */
export const RoseSelected: Story = {
  args: { state: 'selected', livery: 'rose', routeOrigin: 'Novaliches' },
};

/** Fuchsia (Figma's Fuschia): as Violet. */
export const Fuchsia: Story = { args: { livery: 'fuchsia', routeOrigin: 'SM Fairview' } };

/** Selected, fuchsia: as Violet. */
export const FuchsiaSelected: Story = {
  args: { state: 'selected', livery: 'fuchsia', routeOrigin: 'SM Fairview' },
};

/** Pink (4071:7014): as Violet. */
export const Pink: Story = { args: { livery: 'pink', routeOrigin: 'Lagro' } };

/** Selected, pink: as Violet. */
export const PinkSelected: Story = {
  args: { state: 'selected', livery: 'pink', routeOrigin: 'Lagro' },
};

/**
 * LRT-1, a train route: its line's Map/Rail/LightRailWayOne colours and
 * Content/inverse words under the Primary shadow (4074:7402), never a draw.
 */
export const LightRailWayOne: Story = {
  args: { livery: 'light-rail-way-one', routeOrigin: 'Fernando Poe Jr.' },
};

/** Selected, LRT-1: pressed in, under Route/RouteCardPrimarySelected. */
export const LightRailWayOneSelected: Story = {
  args: { state: 'selected', livery: 'light-rail-way-one', routeOrigin: 'Fernando Poe Jr.' },
};

/**
 * LRT-2, a train route: its line's Map/Rail/LightRailWayTwo colours and
 * Content/inverse words under the Primary shadow (4080:4124), never a draw.
 */
export const LightRailWayTwo: Story = {
  args: { livery: 'light-rail-way-two', routeOrigin: 'Fernando Poe Jr.' },
};

/** Selected, LRT-2: pressed in, under Route/RouteCardPrimarySelected. */
export const LightRailWayTwoSelected: Story = {
  args: { state: 'selected', livery: 'light-rail-way-two', routeOrigin: 'Fernando Poe Jr.' },
};

/**
 * MRT-3, a train route: its line's Map/Rail/MetroRailWayThree colours and
 * Content/primary, dark, words under the Primary shadow (4080:4241), never a
 * draw.
 */
export const MetroRailWayThree: Story = {
  args: { livery: 'metro-rail-way-three', routeOrigin: 'Fernando Poe Jr.' },
};

/** Selected, MRT-3: pressed in, under Route/RouteCardPrimarySelected. */
export const MetroRailWayThreeSelected: Story = {
  args: { state: 'selected', livery: 'metro-rail-way-three', routeOrigin: 'Fernando Poe Jr.' },
};

/**
 * At rest, a row opens its direction straight away; a tap anywhere else on
 * the card — its name, the room around its rows — selects it.
 */
export const ARowOpens: Story = {
  args: {
    routeOrigin: 'Tala',
    endPoints: [
      { id: 'a', routeDirection: 'SM Fairview', vehicle: 'Jeepney' },
      { id: 'b', routeDirection: 'Novaliches (Bayan)', vehicle: 'Jeepney' },
    ],
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const doc = canvasElement.ownerDocument;
    // A finger on a row lands on the row, drawn over the name's target.
    const row = canvas.getByText('Novaliches (Bayan)');
    const box = row.getBoundingClientRect();
    const under = doc.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    await expect(under?.closest('[data-testid]')?.getAttribute('data-testid')).toBe('chooser-item');
    await userEvent.click(row);
    await expect(args.onPick).toHaveBeenCalledWith('b');
    await expect(args.onSelect).not.toHaveBeenCalled();
    // Below the last row, the card's own room is the name's.
    const card = canvas.getByTestId('chooser-origin').getBoundingClientRect();
    const room = doc.elementFromPoint(card.x + card.width / 2, card.bottom - 3);
    await expect(room?.getAttribute('data-testid')).toBe('chooser-select');
    if (room) await userEvent.click(room);
    await expect(args.onSelect).toHaveBeenCalledTimes(1);
  },
};

/** Selected, a row still opens its direction; a tap on the card lets it go. */
export const SelectedRowsOpen: Story = {
  args: { ...ARowOpens.args, state: 'selected' },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('Novaliches (Bayan)'));
    await expect(args.onPick).toHaveBeenCalledWith('b');
    await userEvent.click(canvas.getByRole('button', { name: 'Tala', pressed: true }));
    await expect(args.onSelect).toHaveBeenCalledTimes(1);
  },
};

/**
 * A row's State=Pressed (RouteEndPointBar, 3848:11928): press and hold a row
 * — it wears Card/<livery>/Timeline/surface while the finger or the mouse is
 * down, and opens its trip as it lets go. A browser state, `:active`, so
 * there is nothing to set: hold it to see it, in each livery.
 */
export const RowPressed: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {LIVERIES.map((livery) => (
        <RouteCard key={livery} {...args} livery={livery} routeOrigin={livery} />
      ))}
    </div>
  ),
};

/** One place, several ways out: a row each, each its own target. */
export const SeveralWaysOut: Story = {
  args: {
    routeOrigin: 'Tala',
    endPoints: [
      { id: 'a', routeDirection: 'SM Fairview', vehicle: 'Jeepney' },
      { id: 'b', routeDirection: 'Novaliches (Bayan)', vehicle: 'Jeepney' },
    ],
  },
};

/** The set's longest: six ways out — tall enough to show the glow fades out whole. */
export const SixWaysOut: Story = {
  args: {
    livery: 'orange',
    routeOrigin: 'SM Fairview',
    endPoints: ['Tala', 'Novaliches (Bayan)', 'Quiapo', 'Cubao', 'Lagro', 'Fatima'].map((p, i) => ({
      id: String(i),
      routeDirection: p,
      vehicle: 'Jeepney',
    })),
  },
};

/**
 * Each mode's label heads its own rows, stacked down the card: Figma's RouteCard (3665:2265)
 * draws one group, and a place can mix. Rail lines are all "Train"; a mode's rows keep their
 * order, and the tree line ends at each group's last row.
 */
export const MixedModes: Story = {
  args: {
    routeOrigin: 'Cubao',
    endPoints: [
      { id: 'a', routeDirection: 'Tala', vehicle: 'Jeepney' },
      { id: 'b', routeDirection: 'Taft Avenue', vehicle: 'MRT-3' },
      { id: 'c', routeDirection: 'Lagro', vehicle: 'Jeepney' },
      { id: 'd', routeDirection: 'Antipolo', vehicle: 'LRT-2' },
      { id: 'e', routeDirection: 'Pier 4', vehicle: 'Bus' },
    ],
  },
  play: async ({ canvasElement }) => {
    const rows = within(canvasElement).getAllByTestId('chooser-item');
    // Jeepney's two rows, then Train's two, then Bus's one.
    await expect(rows.map((r) => r.textContent)).toEqual([
      'Tala',
      'Lagro',
      'Taft Avenue',
      'Antipolo',
      'Pier 4',
    ]);
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Jeepney')).toBeVisible();
    await expect(canvas.getByText('Train')).toBeVisible();
    await expect(canvas.getByText('Bus')).toBeVisible();
  },
};

/** A route with no drawn vehicle (UV Express, P2P, tricycle) has no label; the rows stand alone. */
export const NoMode: Story = {
  args: { endPoints: [{ id: 'a', routeDirection: 'Tala', vehicle: null }] },
};

/** A place name too long for one line wraps; it is never cut. */
export const LongName: Story = {
  args: {
    livery: 'orange',
    routeOrigin: 'Fairview Teraccess Transport Terminal',
    endPoints: [{ id: 'a', routeDirection: 'Novaliches (Bayan) via Zabarte', vehicle: 'Jeepney' }],
  },
};

/**
 * Two routes between the same ends: each row says its via after the place
 * (directionRowName), as the route's own name does.
 */
export const SameEndsByVia: Story = {
  args: {
    routeOrigin: 'Tala',
    endPoints: [
      { id: 'a', routeDirection: 'SM Fairview via Maligaya', vehicle: 'Jeepney' },
      { id: 'b', routeDirection: 'SM Fairview via Zabarte', vehicle: 'Jeepney' },
    ],
  },
};

/** The grouped card at a phone's width, 390 across, where it is seen. */
export const MixedModesOnPhone: Story = {
  args: MixedModes.args,
  decorators: [
    (Story) => (
      <div className="w-97.5">
        <Story />
      </div>
    ),
  ],
};
