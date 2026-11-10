import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import type { RecordingTrail } from '@/features/routes/map/recording-trail';

import { RideSummaryPreview } from './ride-summary-preview';

/** A walk to the stop, then a jeep east along Aurora Blvd and Marcos Highway. */
const TRAIL: RecordingTrail = {
  lines: [
    {
      mode: 'walk',
      path: [
        [121.052, 14.619],
        [121.0535, 14.6195],
        [121.0545, 14.6205],
      ],
    },
    {
      mode: 'ride',
      path: [
        [121.0545, 14.6205],
        [121.062, 14.627],
        [121.072, 14.631],
        [121.085, 14.629],
        [121.1, 14.626],
        [121.112, 14.627],
        [121.125, 14.632],
        [121.138, 14.64],
      ],
    },
  ],
  markers: [],
  marks: [],
};

const SUMMARY = {
  title: 'Cubao via Marcos Highway',
  to: 'Cogeo',
  mode: 'Jeep',
  distance: { value: '12.7', unit: 'km' },
  time: '1h 12m',
  date: 'Jan 25, 2026',
};

const meta = {
  title: 'Features/Contribute/RideSummaryPreview',
  component: RideSummaryPreview,
  decorators: [
    (Story) => (
      <div className="relative h-[852px] w-[393px] overflow-clip bg-surface-quaternary">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: { summary: SUMMARY, trail: TRAIL, startedAt: Date.UTC(2026, 0, 25), onClose: fn() },
} satisfies Meta<typeof RideSummaryPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A jeep ride with its trail: the card drawn, ready to share. */
export const JeepRide: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('img', {}, { timeout: 5000 })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Share' })).toBeEnabled();
  },
};

/** An upload from another phone: no trail here, the plain ground in its place. */
export const NoTrail: Story = {
  args: { trail: null },
};

/** A walk with a long name: the name cut at two lines, Lakad for the vehicle, no destination. */
export const LongNameWalk: Story = {
  args: {
    summary: {
      ...SUMMARY,
      title: 'UP Diliman Academic Oval by the Sunken Garden near Vinzons Hall',
      to: '',
      mode: 'Lakad',
      distance: { value: '850', unit: 'm' },
      time: '0h 14m',
    },
    trail: { ...TRAIL, lines: [{ ...TRAIL.lines[0], mode: 'walk' }] },
  },
};
