import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { OsmRouteHint } from './osm-route-hint';
import type { OsmRoute } from './osm-route-schema';

const CAROUSEL: OsmRoute = {
  id: 10183711,
  kind: 'bus',
  ref: '1',
  name: 'Route 1: EDSA Carousel',
  from: 'Monumento',
  to: 'PITX',
  network: 'LTFRB National Capital Region',
  operator: 'Mega Manila Consortium Corporation',
  version: 133,
  lastEdit: '2026-07-30',
  extractAt: '2026-11-23T21:21:17Z',
  attribution: '© OpenStreetMap contributors',
  isClipped: false,
  provenance: {},
  line: [
    [120.9864, 14.6571],
    [120.9912, 14.5109],
  ],
  gaps: [{ after: 0, metres: 32 }],
  stops: [],
};

const meta = {
  title: 'Features/Studio/OsmRouteHint',
  component: OsmRouteHint,
  decorators: [
    (Story) => (
      <div className="relative h-[28rem] w-[22rem] bg-surface-quaternary font-sn-pro">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  args: {
    route: CAROUSEL,
    spots: [
      { kind: 'gap', at: [120.9908, 14.5121], metres: 32 },
      { kind: 'stray', at: [121.0435, 14.6372], metres: 64 },
    ],
    onLookAt: fn(),
    onForget: fn(),
  },
} satisfies Meta<typeof OsmRouteHint>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A gap and a stray stretch, in the order the line passes them; each takes the camera there. */
export const PlacesToCheck: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('2 places to check')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: /strays up to 64 m/ }));
    await expect(args.onLookAt).toHaveBeenCalledWith([121.0435, 14.6372]);
  },
};

/** The drawn line follows OSM's all the way. */
export const NothingToCheck: Story = {
  args: { spots: [] },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Nothing to check against OSM’s line yet.')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Not from OSM' }));
    await expect(args.onForget).toHaveBeenCalled();
  },
};
