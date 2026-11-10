import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { DraftAlert } from './draft-alert';
import { KEPT } from './use-stored-draft';
import { reviewMessage } from '../data/review-commands';

const CONFLICT = reviewMessage({ code: 'conflict' });

const meta = {
  title: 'Features/Studio/DraftAlert',
  component: DraftAlert,
  // Under the sidebar's form, 348 across inside its 16 each side (Figma 4300:20893).
  decorators: [
    (Story) => (
      <div className="w-95 bg-surface p-4 font-sn-pro">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  args: { error: null },
} satisfies Meta<typeof DraftAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing failed: nothing shows. */
export const Quiet: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('alert')).toBeNull();
  },
};

/** A refusal with no way round it here: the words alone. */
export const Refused: Story = {
  args: { error: reviewMessage({ code: 'revision_mismatch' }) },
};

/** The editor's own draft refused as stale: Keep my draft beside the conflict. */
export const Conflict: Story = {
  args: { error: CONFLICT, onKeep: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent(CONFLICT);
    await userEvent.click(canvas.getByRole('button', { name: 'Keep my draft' }));
    await expect(args.onKeep).toHaveBeenCalledOnce();
  },
};

/** Keeping: the button says so, and cannot be pressed twice. */
export const Keeping: Story = {
  args: { error: CONFLICT, onKeep: fn(), isKeeping: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Keeping…' })).toBeDisabled();
  },
};

/** Kept: the conflict is gone, and the sidebar says what to do next. */
export const Kept: Story = {
  args: { keepNotice: KEPT },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent(KEPT);
  },
};
