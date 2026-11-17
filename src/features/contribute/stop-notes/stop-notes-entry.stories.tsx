import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { StopNotesEntry } from './stop-notes-entry';

const meta = {
  title: 'Features/Contribute/StopNotesEntry',
  component: StopNotesEntry,
  args: { count: 1, onOpen: fn() },
  decorators: [
    (Story) => (
      <div className="w-[393px] bg-surface p-5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StopNotesEntry>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One stop flagged: the save form's and History's way into Stops notes. Figma draws no entry. */
export const OneStop: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /Stops notes/ }));
    await expect(args.onOpen).toHaveBeenCalledOnce();
  },
};

/** Many stops flagged. */
export const ManyStops: Story = { args: { count: 12 } };

/** No stop flagged: nothing shows. */
export const NoStops: Story = {
  args: { count: 0 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button')).toBeNull();
  },
};
