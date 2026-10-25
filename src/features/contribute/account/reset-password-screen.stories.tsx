import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ResetPasswordScreen } from './reset-password-screen';

const meta = {
  title: 'Features/Contribute/ResetPasswordScreen',
  component: ResetPasswordScreen,
  args: {
    notice: 'If that email has an account, we sent a code',
    isBusy: false,
    error: null,
    onSubmit: fn(),
    onSendNewCode: fn(),
    onBack: fn(),
  },
  decorators: [
    (Story) => (
      <div className="relative h-[844px] w-[390px] overflow-hidden bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ResetPasswordScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** While the reset is out: every button waits. */
export const Resetting: Story = { args: { isBusy: true } };

/** A mistyped code and one that ran out get the same line: the project answers both alike. */
export const CodeWrongOrExpired: Story = {
  args: { error: 'That code is wrong or has expired. Check it, or send a new code.' },
};

/** The code worked but the new password is the old one: the code is spent. */
export const SamePassword: Story = {
  args: { error: "That's already your password. Sign in with it, or send a new code." },
};

export const Offline: Story = {
  args: { error: "No signal — try again when you're online" },
};
