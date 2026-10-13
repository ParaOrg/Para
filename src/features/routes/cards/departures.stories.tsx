import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Departures } from './departures';
import type { Direction } from '../model/routes';

/** Sample data only, shaped like the map file's rows. Not read from Supabase. */
const direction = (
  routeId: string,
  head: string,
  tail: string,
  reversed: boolean,
  drawn: boolean,
): Direction => ({
  id: `${routeId}-${reversed ? 'back' : 'out'}`,
  routeId,
  name: reversed ? `${tail} → ${head}` : `${head} → ${tail}`,
  originTerminal: null,
  destinationTerminal: null,
  shape: drawn
    ? {
        type: 'LineString',
        coordinates: [
          [121.04, 14.74],
          [121.05, 14.75],
        ],
      }
    : null,
  reversed,
  confidence: 'drawn',
  route: {
    id: routeId,
    signboard: null,
    longName: null,
    mode: 'jeepney',
    fareNote: null,
    headHotspotId: `${routeId}-head`,
    tailHotspotId: `${routeId}-tail`,
    via: null,
    name: `${head} – ${tail}`,
  },
});

/** Two routes out of Tala, both drawn both ways. */
const talaRoutes = [
  direction('sm', 'Tala', 'SM Fairview', false, true),
  direction('sm', 'Tala', 'SM Fairview', true, true),
  direction('nova', 'Tala', 'Novaliches', false, true),
  direction('nova', 'Tala', 'Novaliches', true, true),
];

const meta = {
  title: 'Features/Routes/Departures',
  component: Departures,
  // Rows of a list: the studio's hotspot card holds them in its own <ul>, as wide as the card.
  decorators: [
    (Story) => (
      <ul className="w-80 bg-surface">
        <Story />
      </ul>
    ),
  ],
  args: { routes: talaRoutes, back: false, onRoute: fn(), testId: 'card' },
} satisfies Meta<typeof Departures>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One place, two ways out: Tala, then → SM Fairview and → Novaliches. A tap opens the direction. */
export const OneWay: Story = {
  play: async ({ args, canvasElement }) => {
    const row = within(canvasElement).getByRole('button', { name: /Novaliches/ });
    await userEvent.click(row);
    row.blur();
    await expect(args.onRoute).toHaveBeenCalledWith(talaRoutes[2]);
  },
};

/** The way back: a place each — SM Fairview, then Novaliches — each going to Tala. */
export const TheWayBack: Story = { args: { back: true } };

/** A way back still a slot: listed, marked "Not mapped yet", disabled, and opens nothing. */
export const NotMappedYet: Story = {
  args: {
    back: true,
    routes: talaRoutes.map((v) => (v.routeId === 'nova' && v.reversed ? { ...v, shape: null } : v)),
  },
  play: async ({ args, canvasElement }) => {
    const slot = within(canvasElement).getByRole('button', { name: /Not mapped yet/ });
    await expect(slot).toBeDisabled();
    await userEvent.click(slot);
    await expect(args.onRoute).not.toHaveBeenCalled();
  },
};

/** No routes through here yet: nothing to list. */
export const Empty: Story = { args: { routes: [] } };

/** Names too long for the row are cut with an ellipsis; the place above them wraps. Its way back is a slot (below). */
export const LongNames: Story = {
  args: {
    routes: [
      direction(
        'long',
        'Fairview Teraccess Transport Terminal',
        'Novaliches (Bayan) via Zabarte, Quirino Highway and Regalado Avenue',
        false,
        true,
      ),
      direction(
        'long',
        'Fairview Teraccess Transport Terminal',
        'Novaliches (Bayan) via Zabarte, Quirino Highway and Regalado Avenue',
        true,
        false,
      ),
    ],
  },
};

/** The way back of the same, still a slot: a long "Not mapped yet" row, cut as the drawn one is. */
export const LongNamesNotMappedYet: Story = { args: { ...LongNames.args, back: true } };
