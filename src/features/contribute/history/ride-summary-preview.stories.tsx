import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

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
    // Close, the safe answer, has focus as the card opens.
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Close' })).toHaveFocus());
    await expect(await canvas.findByRole('img', {}, { timeout: 5000 })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Share' })).toBeEnabled();
  },
};

/**
 * A ride with no trail to draw (none kept, or still being read) shows the plain ground in its
 * place. The vehicle is a UV Express, the widest one, squeezed into its column.
 */
export const NoTrail: Story = {
  args: { trail: null, summary: { ...SUMMARY, mode: 'UV Express' } },
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

/** See-through, for a story's photo: white words on a clear ground, shown here on the dark. */
export const SeeThrough: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const drawn = await canvas.findByRole('img', {}, { timeout: 5000 });
    const card = drawn.getAttribute('src');
    const toggle = canvas.getByRole('switch', { name: 'See-through, to put over a photo' });
    await userEvent.click(toggle);
    await expect(toggle).toBeChecked();
    // Drawn again, see-through: a new picture in the card's place.
    await waitFor(() => expect(canvas.getByRole('img').getAttribute('src')).not.toBe(card));
    await expect(canvas.getByRole('button', { name: 'Share' })).toBeEnabled();
  },
};
