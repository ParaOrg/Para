import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClientProvider } from '@tanstack/react-query';
import { expect, fn, spyOn, userEvent, within } from 'storybook/test';

import { createQueryClient } from '@/shared/lib/query-client';

import { osmRouteKeys } from './osm-route-keys';
import { OsmRoutePicker } from './osm-route-picker';
import type { OsmRouteIndex } from './osm-route-schema';

/** Three routes of the real index's kinds, near Philcoa and on EDSA. */
const INDEX: OsmRouteIndex = {
  attribution: '© OpenStreetMap contributors',
  extractAt: '2026-11-23T21:21:17Z',
  routes: [
    {
      id: 21041535,
      kind: 'jeepney',
      ref: '',
      name: 'North EDSA → UP Diliman',
      from: 'SM North EDSA',
      to: 'UP Diliman',
      network: 'LTFRB National Capital Region',
      version: 3,
      lastEdit: '2026-06-28',
      gapCount: 0,
      stopCount: 12,
      coarse: [
        [121.0325, 14.6565],
        [121.0516, 14.6542],
      ],
    },
    {
      id: 10183711,
      kind: 'bus',
      ref: '1',
      name: 'Route 1: EDSA Carousel',
      from: 'Monumento',
      to: 'PITX',
      network: 'LTFRB National Capital Region',
      version: 133,
      lastEdit: '2026-07-30',
      gapCount: 1,
      stopCount: 20,
      coarse: [
        [120.9864, 14.6571],
        [121.0561, 14.5864],
        [120.9912, 14.5109],
      ],
    },
    {
      id: 109159,
      kind: 'rail',
      ref: '3',
      name: 'MRT Line 3: North Avenue → Taft Avenue',
      from: 'North Avenue',
      to: 'Taft Avenue',
      network: 'Manila MRT',
      version: 90,
      lastEdit: '2026-07-22',
      gapCount: 0,
      stopCount: 13,
      coarse: [
        [121.0329, 14.6522],
        [121.0565, 14.5865],
        [121.0011, 14.5377],
      ],
    },
  ],
};

/** A client that already holds `index`, or none: the fetch stand-in then answers. */
const withIndex =
  (index: OsmRouteIndex | null) =>
  (Story: () => React.JSX.Element): React.JSX.Element => {
    const client = createQueryClient();
    client.setQueryDefaults(osmRouteKeys.all, { staleTime: Infinity, retry: false });
    if (index) client.setQueryData(osmRouteKeys.index(), index);
    return (
      <QueryClientProvider client={client}>
        <div className="relative h-[40rem] w-[24rem] bg-surface-quaternary font-sn-pro">
          <Story />
        </div>
      </QueryClientProvider>
    );
  };

const meta = {
  title: 'Features/Studio/OsmRoutePicker',
  component: OsmRoutePicker,
  decorators: [withIndex(INDEX)],
  parameters: { layout: 'padded' },
  args: {
    // On EDSA at Ortigas: the Carousel and MRT-3 pass, the Philcoa jeepney does not.
    mapCentre: () => [121.0565, 14.5865],
    onStart: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof OsmRoutePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opened, before anything is typed: what to do. */
export const NothingAsked: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Type a route’s ref or name/)).toBeVisible();
    await expect(canvas.getByText('Placeholder look')).toBeVisible();
  },
};

/** A name finds its routes; each shows its kind, ref and gaps. */
export const Results: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Ref, name or relation id'), 'carousel');
    const list = canvas.getByRole('list', { name: 'OSM routes' });
    await expect(within(list).getAllByRole('button')).toHaveLength(1);
    await expect(within(list).getByText('Bus · 1 · 1 gaps')).toBeVisible();
  },
};

/** The routes passing near the map's centre, nearest first. */
export const NearTheCentre: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Routes near the map’s centre' }));
    const names = within(canvas.getByRole('list', { name: 'OSM routes' }))
      .getAllByRole('button')
      .map((button) => button.textContent);
    await expect(names).toHaveLength(2);
    await expect(names.join(' ')).not.toContain('UP Diliman');
  },
};

/** Nothing matches what was typed. */
export const NoMatch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Ref, name or relation id'), 'zzzzqx');
    await expect(canvas.getByText('No OSM route matches.')).toBeVisible();
  },
};

/** The index on its way. */
export const Loading: Story = {
  decorators: [withIndex(null)],
  beforeEach: () => {
    // An answer that never comes, so the story stays on its way.
    const never = new Promise<Response>((resolve) => void resolve);
    spyOn(globalThis, 'fetch').mockReturnValue(never);
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Reading the OSM routes…')).toBeVisible();
  },
};

/** The index did not load: said, with a way to try again. */
export const Failed: Story = {
  decorators: [withIndex(null)],
  beforeEach: () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }));
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('The OSM routes didn’t load.')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Try again' })).toBeVisible();
  },
};
