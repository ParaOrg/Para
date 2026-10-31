import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { DELETE_ACCOUNT_TEXT } from './delete-account-words';
import { QuestionSheet } from './question-sheet';

const meta = {
  title: 'Features/Contribute/QuestionSheet',
  component: QuestionSheet,
  parameters: { layout: 'fullscreen' },
  args: {
    title: 'Log out?',
    text: 'You can log in again any time with your email and password.',
    confirmLabel: 'Log out',
    busyLabel: 'Logging out…',
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

/** Logout, every recording sent: the question alone. */
export const Default: Story = {};

/** Logout with recordings not sent yet: they stay behind on this phone. */
export const LogoutWithUnsent: Story = {
  args: { text: '4 recordings not sent yet will be left behind on this phone, unsent.' },
};

export const Busy: Story = { args: { isBusy: true } };

/** A try failed: one line in the sheet, where the contributor is, and the answer to try again. */
export const Failed: Story = { args: { error: 'No signal. Try again when you’re online.' } };

/** Delete account: what goes with it, and that it cannot be undone. */
export const DeleteAccount: Story = {
  args: {
    title: 'Delete your account?',
    text: DELETE_ACCOUNT_TEXT,
    confirmLabel: 'Delete account',
    busyLabel: 'Deleting…',
  },
};
