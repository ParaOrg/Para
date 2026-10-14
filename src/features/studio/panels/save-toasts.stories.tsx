import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';

import { SaveToasts } from './save-toasts';

/** Sample data only, shaped like saved rows. Not read from Supabase. */
const talaFairviewOut: DirectionRow = {
  id: 'sample-out',
  routeId: 'sample-route',
  name: 'Tala → SM Fairview',
  originTerminal: null,
  destinationTerminal: null,
  shape: null,
  reversed: false,
  confidence: 'drawn',
  ownerId: 'sample-owner',
  updatedAt: '2026-09-21T00:00:00Z',
  route: {
    id: 'sample-route',
    ownerId: 'sample-owner',
    signboard: null,
    routeCode: null,
    shortName: null,
    longName: null,
    mode: 'jeepney',
    fareNote: null,
    fareAsOf: null,
    headHotspotId: 'sample-tala',
    tailHotspotId: 'sample-fairview',
    via: null,
    name: 'Tala – SM Fairview',
  },
};

const tala: HotspotRow = {
  id: 'sample-tala',
  ownerId: 'sample-owner',
  name: 'Tala Jeepney Terminal',
  informal: 'Tala',
  aliases: [],
  kind: 'terminal',
  point: { type: 'Point', coordinates: [121.0424, 14.741507] },
  area: null,
  note: null,
  createdAt: '2026-09-21T00:00:00Z',
};

const meta = {
  title: 'Features/Studio/SaveToasts',
  component: SaveToasts,
  // Over the foot of the map, as the workshop shows it.
  decorators: [
    (Story) => (
      <div className="relative h-40 w-[28rem] bg-neutral-200">
        <Story />
      </div>
    ),
  ],
  args: {
    toast: { kind: 'route', v: talaFairviewOut },
    isDrawing: false,
    canDrawReturnTrip: false,
    onDismiss: fn(),
    onDrawReturnTrip: fn(),
  },
} satisfies Meta<typeof SaveToasts>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A route saved, drawn both ways: no offer. */
export const RouteSaved: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent('Saved Tala – SM Fairview');
    await expect(canvas.queryByRole('button', { name: 'Draw the return trip' })).toBeNull();
  },
};

/** A route saved with its other direction still undrawn: the return trip offered, by route. */
export const ReturnTripOffered: Story = {
  args: { canDrawReturnTrip: true },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Draw the return trip' }));
    await expect(args.onDrawReturnTrip).toHaveBeenCalledWith('sample-route');
  },
};

/** A terminal saved, named by what people call it. */
export const HotspotSaved: Story = {
  args: { toast: { kind: 'hotspot', s: tala } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent(
      'Saved terminal Tala',
    );
  },
};

/** A problem: red, and announced as one. */
export const Notice: Story = {
  args: {
    toast: {
      kind: 'notice',
      text: '"Tala" is where Tala – SM Fairview ends. Delete that route first.',
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('alert')).toBeVisible();
  },
};

/** While drawing, a saved toast hides. */
export const SavedWhileDrawing: Story = {
  args: { isDrawing: true, canDrawReturnTrip: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId('toast')).toBeNull();
  },
};

/** While drawing, a notice still shows: a follow refused, a save that failed. */
export const NoticeWhileDrawing: Story = {
  args: { ...Notice.args, isDrawing: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('alert')).toBeVisible();
  },
};

/** A long route name wraps inside the toast. */
export const LongContent: Story = {
  args: {
    canDrawReturnTrip: true,
    toast: {
      kind: 'route',
      v: {
        ...talaFairviewOut,
        name: 'Novaliches Bayan → SM Fairview via Quirino Highway and Regalado Avenue',
        route: {
          ...talaFairviewOut.route,
          name: 'Novaliches Bayan – SM Fairview – Lagro via Quirino Highway',
        },
      },
    },
  },
};

/** Nothing to say: nothing shown. */
export const Empty: Story = {
  args: { toast: null },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId('toast')).toBeNull();
  },
};
