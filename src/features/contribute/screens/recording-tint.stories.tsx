import type { Meta, StoryObj } from '@storybook/react-vite';

import { RecordingTint } from './recording-tint';

const meta = {
  title: 'Features/Contribute/RecordingTint',
  component: RecordingTint,
  args: { state: 'lakad' },
  decorators: [
    (Story) => (
      <div className="@container relative h-[852px] w-[393px] bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RecordingTint>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Recording on Lakad: the edges in blue (4481:23631). */
export const Lakad: Story = {};

/** Recording on Sakay: green (4481:23798). */
export const Sakay: Story = { args: { state: 'sakay' } };

/** Paused: the red card's surface (4481:23636). */
export const Paused: Story = { args: { state: 'paused' } };
