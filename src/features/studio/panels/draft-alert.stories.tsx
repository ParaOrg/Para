import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { DraftAlert } from './draft-alert';
import { KEEPABLE_CONFLICT, KEPT } from './use-stored-draft';
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

/** Nothing failed: nothing shows, only the empty status region a screen reader listens to. */
export const Quiet: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('alert')).toBeNull();
    await expect(within(canvasElement).getByRole('status')).toBeEmptyDOMElement();
  },
};

/** A refusal with no way round it here: the words alone. */
export const Refused: Story = {
  args: { error: reviewMessage({ code: 'revision_mismatch' }) },
};

/** The editor's own draft refused as stale: Keep my draft beside the conflict, in its own words. */
export const Conflict: Story = {
  args: { error: KEEPABLE_CONFLICT, onKeep: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent(KEEPABLE_CONFLICT);
    await userEvent.click(canvas.getByRole('button', { name: 'Keep my draft' }));
    await expect(args.onKeep).toHaveBeenCalledOnce();
  },
};

/** Keeping: the button says so, and cannot be pressed twice. */
export const Keeping: Story = {
  args: { error: KEEPABLE_CONFLICT, onKeep: fn(), isKeeping: true },
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

/** Keep my draft refused (another change was under way): the conflict, the button again, and why. */
export const KeepRefused: Story = {
  args: { error: KEEPABLE_CONFLICT, onKeep: fn(), keepNotice: reviewMessage({ code: 'busy' }) },
};

/** A conflict with no Keep my draft (not the editor's own draft): the general words alone. */
export const ConflictNotKeepable: Story = {
  args: { error: CONFLICT },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: 'Keep my draft' })).toBeNull();
  },
};
