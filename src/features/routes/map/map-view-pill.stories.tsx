import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { BASEMAPS } from './basemap';
import { BASEMAP_THUMBNAILS } from './basemap-thumbnails';
import { MapViewPill } from './map-view-pill';
import { VIEW_MODE_KEY } from './view-mode';

const meta = {
  title: 'Features/Routes/MapViewPill',
  component: MapViewPill,
  args: {
    map: null,
    isMapLoaded: true,
    basemaps: BASEMAPS,
    thumbnails: BASEMAP_THUMBNAILS,
    labelsPlace: 'map',
  },
  decorators: [
    (Story) => {
      // A first visit: 2D.
      localStorage.removeItem(VIEW_MODE_KEY);
      return (
        <div className="flex h-[32rem] justify-end bg-bg-surface-secondary p-4">
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof MapViewPill>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The public map's top right (4885:44810): layers over "3D", one 48 × 96 pill. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const design = canvas.getByRole('button', { name: 'Map design' });
    const view = canvas.getByRole('button', { name: 'Switch to 3D view' });
    const [a, b] = [design.getBoundingClientRect(), view.getBoundingClientRect()];
    await expect([a.width, a.height, b.width, b.height]).toEqual([48, 48, 48, 48]);
    await expect(b.top - a.bottom).toBe(0);
  },
};

/** A tap on "3D" offers 2D next, and the device keeps it. */
export const Toggled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Switch to 3D view' }));
    await expect(canvas.getByRole('button', { name: 'Switch to 2D view' })).toBeVisible();
    await expect(localStorage.getItem(VIEW_MODE_KEY)).toBe('3d');
  },
};

/** The map still loading: the design button waits, the view button does not. */
export const MapLoading: Story = {
  args: { isMapLoaded: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Map design' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Switch to 3D view' })).toBeEnabled();
  },
};

/** In the top right, the Map Style card opens down from the pill. */
export const CardOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Map design' }));
    const card = await waitFor(() => canvas.getByRole('dialog'));
    const pill = canvas.getByRole('button', { name: 'Map design' }).getBoundingClientRect();
    await expect(card.getBoundingClientRect().top).toBeGreaterThan(pill.bottom);
  },
};
