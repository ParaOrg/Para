import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClientProvider } from '@tanstack/react-query';
import { expect, fn, spyOn, userEvent, within } from 'storybook/test';

import { createQueryClient } from '@/shared/lib/query-client';
import type { LngLat } from '@/shared/utils/geo';

import { OsmRouteCard } from './osm-route-card';
import { osmRouteKeys } from './osm-route-keys';
import type { OsmRoute } from './osm-route-schema';

/** A point `m` metres east of EDSA at Ortigas, `n` north. */
const at = (m: number, n = 0): LngLat => [121.0565 + m / 107_700, 14.5865 + n / 110_600];

/** The Carousel northward as the file has it, its line shortened: one gap, two stops. */
const CAROUSEL: OsmRoute = {
  id: 10183711,
  kind: 'bus',
  ref: '1',
  name: 'Route 1: EDSA Carousel',
  from: 'Monumento',
  to: 'PITX',
  network: 'LTFRB National Capital Region',
  operator: 'Mega Manila Consortium Corporation;Jell Transport Inc.',
  version: 133,
  lastEdit: '2026-07-30',
  extractAt: '2026-11-23T21:21:17Z',
  attribution: '© OpenStreetMap contributors',
  isClipped: false,
  provenance: {
    'source:ref': 'LTFRB Memorandum Circular 2022-067',
    'source:ref:2020': 'LTFRB Memorandum Circular 2020-019',
  },
  line: [at(0), at(0, -1000), at(0, -2000), at(0, -3000)],
  gaps: [{ after: 1, metres: 32 }],
  stops: [
    { role: 'stop', point: at(0), name: 'Ortigas' },
    { role: 'stop_exit_only', point: at(0, -3000), name: 'Guadalupe' },
  ],
};

/** A jeepney that goes out 2 km and comes back on the next street. */
const OUT_AND_BACK: OsmRoute = {
  ...CAROUSEL,
  id: 8202455,
  kind: 'jeepney',
  ref: '',
  name: 'Central Mall–DBB-G',
  from: 'Central Mall',
  to: 'Central Mall',
  operator: '',
  provenance: {},
  line: [at(0), at(1000), at(2000), at(1000, 60), at(0, 60)],
  gaps: [],
};

/** Five gaps: better traced by hand. */
const BROKEN: OsmRoute = {
  ...CAROUSEL,
  id: 3316644,
  name: 'Alabang–Zapote',
  isClipped: true,
  provenance: { note: 'incomplete' },
  line: Array.from({ length: 12 }, (_, i) => at(i * 300)),
  gaps: [1, 3, 5, 7, 9].map((after) => ({ after, metres: 120 })),
};

/** A client that already holds the route, or none: the fetch stand-in then answers. */
const holding =
  (route: OsmRoute | null) =>
  (Story: () => React.JSX.Element): React.JSX.Element => {
    const client = createQueryClient();
    client.setQueryDefaults(osmRouteKeys.all, { staleTime: Infinity, retry: false });
    if (route) client.setQueryData(osmRouteKeys.route(route.id), route);
    return (
      <QueryClientProvider client={client}>
        <div className="flex w-80 flex-col gap-3 rounded-2xl bg-surface p-4 font-sn-pro text-sm text-content-secondary">
          <Story />
        </div>
      </QueryClientProvider>
    );
  };

const meta = {
  title: 'Features/Studio/OsmRouteCard',
  component: OsmRouteCard,
  decorators: [holding(CAROUSEL)],
  parameters: { layout: 'padded' },
  args: { id: CAROUSEL.id, onStart: fn(), onBack: fn() },
} satisfies Meta<typeof OsmRouteCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Carousel: where it comes from, the mapper's own tags, then Start drawing with the whole line. */
export const Ready: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('link', { name: 'Relation 10183711' })).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/relation/10183711/history',
    );
    await expect(canvas.getByText('source:ref: LTFRB Memorandum Circular 2022-067')).toBeVisible();
    await expect(canvas.getByText(/1 gaps · 2 stops mapped/)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Start drawing' }));
    await expect(args.onStart).toHaveBeenCalledWith(CAROUSEL, CAROUSEL);
  },
};

/** A route that goes out and comes back: each way is drawn on its own. */
export const OutAndBack: Story = {
  decorators: [holding(OUT_AND_BACK)],
  args: { id: OUT_AND_BACK.id },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('button', { name: 'Start drawing' })).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Draw the way back' }));
    const [, part] = args.onStart.mock.calls[0];
    await expect(part.line[0]).toEqual(OUT_AND_BACK.line[2]);
  },
};

/** Many gaps, clipped, and a note from its mapper: the card says it may be quicker by hand. */
export const TooBroken: Story = {
  decorators: [holding(BROKEN)],
  args: { id: BROKEN.id },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Too broken to seed well/)).toBeVisible();
    await expect(canvas.getByText(/clipped to the map’s area/)).toBeVisible();
    await expect(canvas.getByText('note: incomplete')).toBeVisible();
  },
};

/** The route's file did not load: said, with Try again and Back. */
export const Failed: Story = {
  decorators: [holding(null)],
  beforeEach: () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Relation 10183711 didn’t load.')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Back to the list' })).toBeVisible();
  },
};
