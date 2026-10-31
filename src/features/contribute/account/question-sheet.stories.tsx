import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { DELETE_ACCOUNT_TEXT } from './delete-account-words';
import { QuestionSheet } from './question-sheet';

const meta = {
  title: 'Features/Contribute/QuestionSheet',
  component: QuestionSheet,
  parameters: { layout: 'fullscreen' },
  args: {
    title: 'Delete your account?',
    text: DELETE_ACCOUNT_TEXT,
    confirmLabel: 'Delete account',
    busyLabel: 'Deleting…',
    isBusy: false,
    error: null,
    onConfirm: fn(),
    onCancel: fn(),
  },
  decorators: [
    (Story) => (
      <div className="relative h-[852px] w-[393px] overflow-hidden bg-surface">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof QuestionSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Delete account: what goes with it, and that it cannot be undone. */
export const Default: Story = {};

/** Under way: it says so, and nothing cancels it, not Cancel, Escape or the dimmed page. */
export const Busy: Story = {
  args: { isBusy: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    await expect(args.onCancel).not.toHaveBeenCalled();
  },
};

/** A try failed: one line in the sheet, where the contributor is, and the answer to try again. */
export const Failed: Story = { args: { error: 'No signal — try again when you’re online' } };
