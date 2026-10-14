import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow, LineStringGeoJSON } from '@/features/routes/model/routes';

import { TripCardExtras } from './trip-card-extras';

/** Sample data only, shaped like saved rows. Not read from Supabase. */
const line: LineStringGeoJSON = {
  type: 'LineString',
  coordinates: [
    [121.0424, 14.741507],
    [121.0583, 14.7342],
  ],
};

const out: DirectionRow = {
  id: 'sample-out',
  routeId: 'sample-route',
  name: 'Tala → SM Fairview',
  originTerminal: null,
  destinationTerminal: null,
  shape: line,
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

/** The way back, not drawn yet: an empty slot. */
const back: DirectionRow = {
  ...out,
  id: 'sample-back',
  name: 'SM Fairview → Tala',
  shape: null,
  reversed: true,
};

const hotspot = (id: string, name: string, coordinates: [number, number]): HotspotRow => ({
  id,
  ownerId: 'sample-owner',
  name,
  informal: null,
  aliases: [],
  kind: 'terminal',
  point: { type: 'Point', coordinates },
  area: null,
  note: null,
  createdAt: '2026-09-21T00:00:00Z',
});

const meta = {
  title: 'Features/Studio/TripCardExtras',
  component: TripCardExtras,
  // Under the trip card's tiles, at the card's width, as route-facts.stories.tsx has it.
  decorators: [
    (Story) => (
      <div className="w-[369px] bg-surface">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  args: {
    direction: out,
    directions: [out, back],
    hotspots: [
      hotspot('sample-tala', 'Tala', [121.0424, 14.741507]),
      hotspot('sample-fairview', 'SM Fairview', [121.0583, 14.7342]),
    ],
    hotspotsAlong: () => [],
    canEdit: true,
    onEdit: fn(),
    onExtend: fn(),
    onDelete: fn(),
    onSignboardsChanged: fn(),
  },
} satisfies Meta<typeof TripCardExtras>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An editor on a drawn direction: Edit, Extend and Delete, the export, the signboards. */
export const EditorDrawn: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Edit route' }));
    await expect(args.onEdit).toHaveBeenCalled();
    await expect(canvas.getByRole('button', { name: /Extend/ })).toBeVisible();
    await expect(canvas.getByRole('button', { name: /Delete/ })).toBeVisible();
  },
};

/** An editor on the undrawn way back: no Extend, as the workshop offers none. */
export const EditorUndrawn: Story = {
  args: { direction: back, onExtend: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Edit route' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: /Extend/ })).toBeNull();
  },
};

/** Signed out: the facts and the export, none of the editor's actions or signboards. */
export const SignedOut: Story = {
  args: { canEdit: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('button', { name: 'Edit route' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: /Delete/ })).toBeNull();
  },
};

/** Signed out on the undrawn way back. */
export const SignedOutUndrawn: Story = {
  args: { canEdit: false, direction: back, onExtend: undefined },
};
