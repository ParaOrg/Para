import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { Hotspot } from '@/features/routes/model/hotspots';
import type { LandmarkFileRead } from '@/features/routes/published/fetch-landmarks';

import { StudioSearch } from './studio-search';

const hotspot = (id: string, name: string, informal: string, at: [number, number]): Hotspot => ({
  id,
  name,
  informal,
  aliases: [],
  kind: 'hintuan',
  point: { type: 'Point', coordinates: at },
  area: null,
  note: null,
  createdAt: '2026-01-01T00:00:00Z',
  line: null,
});

const LANDMARKS: LandmarkFileRead = {
  attribution: '© OpenStreetMap contributors',
  landmarks: [
    {
      id: 'w1',
      name: 'Ayala Malls TriNoma',
      kind: 'mall',
      point: [121.0335, 14.6535],
      reach: [[121.0335, 14.6535]],
      aliases: ['TriNoma'],
    },
  ],
};

const meta = {
  title: 'Features/Studio/StudioSearch',
  component: StudioSearch,
  args: {
    map: null,
    hotspots: [
      hotspot('h1', 'Cubao Farmers', 'Cubao', [121.054, 14.619]),
      hotspot('h2', 'MRT-3 North Avenue Station', 'North Avenue', [121.032, 14.652]),
    ],
    directionsAt: () => [],
    isDrawing: false,
    onOpenHotspot: fn(),
    loadLandmarks: () => Promise.resolve(LANDMARKS),
  },
  // The studio's map box at a computer's size: the bar shows from @float up.
  decorators: [
    (Story) => (
      <div className="@container relative h-[30rem] w-[1100px] bg-surface-tertiary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StudioSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

const field = (canvasElement: HTMLElement) =>
  within(canvasElement).getByRole('combobox', { name: 'Search places' });

/** At rest: the field at the top of the map. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(field(canvasElement)).toBeVisible();
  },
};

/** A hotspot chosen with nothing drawn: its card opens, as a tap on its box does. */
export const OpensItsCard: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.type(field(canvasElement), 'cubao');
    await userEvent.keyboard('{Enter}');
    await expect(args.onOpenHotspot).toHaveBeenCalledWith('h1');
  },
};

/** While a line is drawn: a hotspot chosen only moves the camera; no card opens (decision 46). */
export const WhileDrawing: Story = {
  args: { isDrawing: true },
  play: async ({ args, canvasElement }) => {
    await userEvent.type(field(canvasElement), 'cubao');
    await userEvent.keyboard('{Enter}');
    await expect(args.onOpenHotspot).not.toHaveBeenCalled();
    await expect(field(canvasElement)).toHaveValue('');
  },
};

/** A landmark, listed after the studio's places, with the credit; choosing it lists no routes. */
export const Landmark: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.type(field(canvasElement), 'trinoma');
    await waitFor(() =>
      expect(within(canvasElement).getAllByRole('option')[0]).toHaveTextContent('Ayala Malls'),
    );
    await expect(within(canvasElement).getByText('© OpenStreetMap contributors')).toBeVisible();
    await userEvent.keyboard('{Enter}');
    await expect(within(canvasElement).queryByRole('region')).toBeNull();
    await expect(args.onOpenHotspot).not.toHaveBeenCalled();
  },
};
