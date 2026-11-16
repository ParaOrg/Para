import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { STOP_NOTE_PILL_MS, StopNotePill } from './stop-note-pill';

const meta = {
  title: 'Features/Contribute/StopNotePill',
  component: StopNotePill,
  args: { onOpen: fn(), onGone: fn() },
  // Where the recording screen stands it: 20 in from a phone's sides, over the map.
  decorators: [
    (Story) => (
      <div className="w-[393px] bg-surface-quaternary px-5 py-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StopNotePill>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Just after a flag (4707:9551): the ring runs down over five seconds round the plus. */
export const Default: Story = {};

/** A tap opens the stop's note card. */
export const Tapped: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /Add a stop note/ }));
    await expect(args.onOpen).toHaveBeenCalledOnce();
  },
};

/** Left alone, its time runs out and it goes. */
export const RunsOut: Story = {
  play: async ({ args }) => {
    await waitFor(() => expect(args.onGone).toHaveBeenCalledOnce(), {
      timeout: STOP_NOTE_PILL_MS + 1000,
    });
  },
};
