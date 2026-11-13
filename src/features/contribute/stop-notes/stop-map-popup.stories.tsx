import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { RecordingTrail } from '@/features/routes/map/recording-trail';
import type { LngLat } from '@/shared/utils/geo';

import { StopMapPopup } from './stop-map-popup';

const AT: LngLat = [121.0567, 14.6539];
const TRAIL: RecordingTrail = {
  lines: [
    {
      mode: 'ride',
      path: [
        [121.0547, 14.6519],
        [121.0567, 14.6539],
        [121.0592, 14.6561],
      ],
    },
  ],
  markers: [],
  marks: [{ at: AT }],
};

const meta = {
  title: 'Features/Contribute/StopMapPopup',
  component: StopMapPopup,
  args: {
    trail: TRAIL,
    at: AT,
    place: 'Near Philcoa',
    stopName: 'Stop 2',
    count: 12,
    onClose: fn(),
    onDelete: fn(),
  },
  decorators: [
    (Story) => (
      <div className="relative h-[852px] w-[393px] overflow-hidden bg-surface">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StopMapPopup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma's stop map (4725:29150): the trail round the stop, the flag count, Close and Delete. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }));
    await expect(args.onDelete).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};

/** From History, read only: Close alone fills the foot. */
export const ReadOnly: Story = {
  args: { onDelete: undefined },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: 'Delete' })).toBeNull();
  },
};

/** A stop with no position: the map opens on the region, and the place says so. */
export const NoPosition: Story = { args: { at: null, trail: null, place: 'No nearby place' } };
