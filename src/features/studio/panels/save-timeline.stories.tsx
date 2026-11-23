import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import type { TimelineRow } from '@/features/routes/model/timeline';

import { SaveTimeline } from './save-timeline';

const row = (label: string, kind: TimelineRow['kind'] = 'hintuan'): TimelineRow => ({
  id: label.toLowerCase().replace(/\W+/g, '-'),
  label,
  kind,
});

const meta = {
  title: 'Features/Studio/SaveTimeline',
  component: SaveTimeline,
  // At the sidebar's width, 348 inside its 16 each side.
  decorators: [
    (Story) => (
      <div className="w-95 bg-surface p-4 font-sn-pro">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  args: {
    isLoop: false,
    loopPlacesCount: 0,
    preview: {
      from: row('Tala', 'terminal'),
      between: [row('Bagong Silang')],
      to: row('SM Fairview', 'terminal'),
    },
  },
} satisfies Meta<typeof SaveTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A route passing a hintuan: the Route line, and no hint. */
export const PassesAHintuan: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Route line' })).toBeVisible();
    await expect(canvas.queryByText(/no hintuan yet/)).toBeNull();
  },
};

/** A route between its ends with none yet: the hint says how one gets on it. */
export const NoHintuanYet: Story = {
  args: {
    preview: { from: row('Tala', 'terminal'), between: [], to: row('SM Fairview', 'terminal') },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/Passes through no hintuan yet/)).toBeVisible();
  },
};

/** An ikot going round no place yet: its own hint. */
export const IkotNoPlaceYet: Story = {
  args: { isLoop: true, loopPlacesCount: 0, preview: { from: null, between: [], to: null } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/Goes round no place yet/)).toBeVisible();
  },
};
