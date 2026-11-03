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

/** Recording on Lakad: the edges in blue/700 at 10% (OverlayIndicator, 4493:1697). */
export const Lakad: Story = {};

/** Recording on Sakay: green/700. */
export const Sakay: Story = { args: { state: 'sakay' } };

/** Paused: neutral/900. */
export const Paused: Story = { args: { state: 'paused' } };
