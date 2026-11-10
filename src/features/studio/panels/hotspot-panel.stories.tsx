import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClientProvider } from '@tanstack/react-query';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { HotspotRow } from '@/features/routes/model/hotspots';
import { createQueryClient } from '@/shared/lib/query-client';
import type { LngLat } from '@/shared/utils/geo';

import { HotspotPanel } from './hotspot-panel';
import { SaveBesideFrame, SaveSheetFrame } from './save-frames';
import type { Drawing } from '../drawing/use-drawing';

/** Sample data only, shaped like saved rows. Not read from Supabase. */
function hotspot(
  id: string,
  name: string,
  kind: HotspotRow['kind'],
  informal: string | null = null,
): HotspotRow {
  return {
    id,
    name,
    informal,
    aliases: [],
    kind,
    point: { type: 'Point', coordinates: [121.0424, 14.741507] },
    area: null,
    note: null,
    createdAt: '2026-09-21T00:00:00Z',
  };
}

/** The hotspots already saved: what the informal-name box offers while typing. */
const hotspots: HotspotRow[] = [
  hotspot('s-tala', 'Tala Jeepney Terminal', 'terminal', 'Tala'),
  hotspot('s-fairview-a', 'SM Fairview Terminal A', 'terminal', 'SM Fairview'),
  hotspot('s-malaria', 'Malaria', 'hintuan'),
];

/**
 * Just the parts of a drawing the panel reads: a four-corner outline and which
 * kind it is. Sample data only: a story has no Supabase client, so pressing
 * Save here shows an error and writes nothing.
 */
function outline(kind: 'terminal' | 'hintuan', hotspotId: string | null = null): Drawing {
  const [x, y] = [121.0424, 14.741507];
  const d = 0.0003;
  const controlPoints: LngLat[] = [
    [x - d, y - d],
    [x + d, y - d],
    [x + d, y + d],
    [x - d, y + d],
  ];
  return {
    controlPoints,
    segments: [],
    area: { kind, hotspotId },
    uTurns: [],
  } as unknown as Drawing;
}

const meta = {
  title: 'Features/Studio/HotspotPanel',
  component: HotspotPanel,
  // Over a map-sized box, as the sheet covers the map at Done; the `beside` parameter stands it
  // left of the map instead, as on a computer. Publish asks the review queries, so the panel sits
  // under a query client of its own.
  decorators: [
    (Story) => (
      <QueryClientProvider client={createQueryClient()}>
        <Story />
      </QueryClientProvider>
    ),
    (Story, ctx) =>
      ctx.parameters.beside ? (
        <div className="flex h-176 bg-neutral-200">
          <SaveBesideFrame>
            <Story />
          </SaveBesideFrame>
          <div className="flex-1" />
        </div>
      ) : (
        <div className="relative h-176 bg-neutral-200">
          <SaveSheetFrame>
            <Story />
          </SaveSheetFrame>
        </div>
      ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    draw: outline('hintuan'),
    existing: null,
    existingLinks: [],
    directions: [],
    hotspots,
    onCancel: fn(),
  },
} satisfies Meta<typeof HotspotPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A new hintuan. The name is what is on the ground; the informal name is what people say, offered from the ones in use. */
export const NewHintuan: Story = {};

/** A new terminal: the same two names, and the note that a place has one terminal. */
export const NewTerminal: Story = {
  args: { draw: outline('terminal') },
};

/** Editing a saved terminal that already carries both names and two aliases. */
export const EditTerminal: Story = {
  args: {
    draw: outline('terminal', 's-tala'),
    existing: { ...hotspots[0], aliases: ['Tala Terminal', 'Terminal Tala'] },
  },
};

/**
 * A new hintuan beside the map on a computer: its Information, what passes it, its Line detail
 * (corners, no distance) and the sidebar's footer.
 */
export const BesideTheMap: Story = {
  parameters: { beside: true },
  args: { onCancel: undefined, saveBlocked: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Hintuan Information' })).toBeVisible();
    await expect(canvas.getByTestId('line-detail')).toHaveTextContent('Corners4');
    await expect(canvas.getByRole('button', { name: 'Exit' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Save as draft' })).toBeVisible();
  },
};

/** A published terminal opened unchanged beside the map: Published, Exit and Unpublish. */
export const BesideTheMapPublished: Story = {
  parameters: { beside: true },
  args: {
    ...EditTerminal.args,
    onCancel: undefined,
    saveBlocked: null,
    isPublished: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('line-detail')).toHaveTextContent('StatusPublished');
    await expect(canvas.getByRole('button', { name: 'Unpublish' })).toBeVisible();
  },
};

/** At a phone's width: the sheet fills the screen, Back to map in Exit's place. */
export const Phone: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Back to map' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Exit' })).toBeNull();
  },
};

/** Beside the map before the outline can be saved: the saves wait, and the sidebar says why. */
export const BesideTheMapBlocked: Story = {
  parameters: { beside: true },
  args: { onCancel: undefined, saveBlocked: 'Add at least 3 corners' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Add at least 3 corners')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Save as draft' })).toBeDisabled();
  },
};

/** A new terminal beside the map: its checklist of the routes it may hold, and the saves. */
export const BesideTheMapTerminal: Story = {
  parameters: { beside: true },
  args: { draw: outline('terminal'), onCancel: undefined, saveBlocked: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Terminal Information' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Publish' })).toBeVisible();
  },
};

/**
 * Unpublish refused (here, with no database to reach): the sidebar stays, and says why in an
 * alert the screen reader announces.
 */
export const BesideTheMapPublishedUnpublishRefused: Story = {
  parameters: { beside: true },
  args: { ...EditTerminal.args, onCancel: undefined, saveBlocked: null, isPublished: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    window.confirm = () => true;
    await userEvent.click(canvas.getByRole('button', { name: 'Unpublish' }));
    await expect(await canvas.findByRole('alert')).toBeVisible();
  },
};
