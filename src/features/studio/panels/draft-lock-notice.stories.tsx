import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { DraftLockNotice } from './draft-lock-notice';

const meta = {
  title: 'Features/Studio/DraftLockNotice',
  component: DraftLockNotice,
  args: { lock: { state: 'other', name: 'Marisol' }, onRetry: () => undefined },
} satisfies Meta<typeof DraftLockNotice>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ChangedByName: Story = {};
export const NoNameOnFile: Story = { args: { lock: { state: 'other', name: null } } };
export const Checking: Story = { args: { lock: { state: 'checking' } } };
export const CouldNotCheck: Story = { args: { lock: { state: 'unknown' } } };

/** Another editor's draft, which any editor may approve as it stands. */
export const WithApprove: Story = {
  args: { onApprove: fn() },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Approve' }));
    await expect(args.onApprove).toHaveBeenCalled();
  },
};

/** Approving: the button says so, and cannot be pressed twice. */
export const Approving: Story = {
  args: { onApprove: fn(), isApproving: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Approving…' })).toBeDisabled();
  },
};

/** Approve refused: why, in an alert. */
export const ApproveRefused: Story = {
  args: {
    onApprove: fn(),
    error: 'Someone changed this draft. Refresh it before acting again.',
  },
};

/** Still checking whose draft it is: no Approve yet. */
export const CheckingWithApprove: Story = {
  args: { lock: { state: 'checking' }, onApprove: fn() },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: 'Approve' })).toBeNull();
  },
};
