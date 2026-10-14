import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { Hotspot } from '@/features/routes/model/hotspots';
import type { Direction, LineStringGeoJSON } from '@/features/routes/model/routes';

import { RouteExportPanel, type RouteExportCalls } from './route-export-panel';

const route = {
  id: 'r1',
  signboard: null,
  longName: null,
  mode: 'jeepney',
  fareNote: null,
  headHotspotId: 'h1',
  tailHotspotId: 'h2',
  via: null,
  name: 'Tala – SM Fairview',
} as const;

/** A fresh line each read, as the live one is: a new array, never one shared between reads. */
const line = (): LineStringGeoJSON => ({
  type: 'LineString',
  coordinates: [
    [121.0, 14.0],
    [121.02, 14.02],
  ],
});

const direction = (id: string, reversed: boolean): Direction => ({
  id,
  routeId: 'r1',
  name: reversed ? 'SM Fairview → Tala' : 'Tala → SM Fairview',
  originTerminal: null,
  destinationTerminal: null,
  shape: line(),
  reversed,
  confidence: 'drawn',
  route,
});

const hotspot = (id: string, name: string, coordinates: [number, number]): Hotspot => ({
  id,
  kind: 'terminal',
  name,
  informal: null,
  aliases: [],
  point: { type: 'Point', coordinates },
  area: null,
  note: null,
  createdAt: '2026-10-13T00:00:00Z',
});

/** The live reads, in memory: the line after a moment, and the save caught rather than downloaded. */
const standIn = (delayMs = 300): RouteExportCalls => ({
  loadLine: fn(async () => {
    await new Promise((r) => setTimeout(r, delayMs));
    return line();
  }),
  save: fn(),
});

const meta = {
  title: 'Features/Studio/RouteExportPanel',
  component: RouteExportPanel,
  parameters: { layout: 'padded' },
  args: {
    directions: [direction('d1', false), direction('d2', true)],
    hotspots: [hotspot('h1', 'Tala', [121.0, 14.0]), hotspot('h2', 'SM Fairview', [121.02, 14.02])],
    hotspotsAlong: () => [],
    calls: standIn(),
  },
  decorators: [(Story) => <div className="w-[369px] bg-surface pt-4">{Story()}</div>],
} satisfies Meta<typeof RouteExportPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A format picked: its button reads Exporting… while the full lines are read, then the file is saved. */
export const Exporting: Story = {
  args: { calls: standIn(1500) },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'GeoJSON' }));
    await expect(canvas.getByRole('button', { name: 'Exporting…' })).toBeDisabled();
    await waitFor(() => expect(args.calls?.save).toHaveBeenCalledOnce(), { timeout: 3000 });
  },
};

/** The line could not be read: what happened, and what to do. */
export const ReadFailed: Story = {
  args: {
    calls: {
      loadLine: fn(async () => {
        throw new Error('Failed to fetch');
      }),
      save: fn(),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'CSV' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent(/Check your connection/);
  },
};
