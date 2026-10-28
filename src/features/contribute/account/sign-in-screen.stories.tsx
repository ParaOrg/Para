import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { NO_CAPTCHA } from './account-stories-args';
import { SignInScreen } from './sign-in-screen';

const meta = {
  title: 'Features/Contribute/SignInScreen',
  component: SignInScreen,
  args: {
    isBusy: false,
    error: null,
    captcha: NO_CAPTCHA,
    onSubmit: fn(),
    onCreateAccount: fn(),
    onForgotPassword: fn(),
  },
  decorators: [
    (Story) => (
      <div className="relative h-[844px] w-[390px] overflow-hidden bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SignInScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A refused try: one line under the fields. */
export const WrongPassword: Story = { args: { error: 'Wrong email or password' } };

/** No signal: the same line the page shows for every failed request. */
export const Offline: Story = {
  args: { error: "No signal — try again when you're online" },
};

/** While the request is out: both buttons wait. */
export const Busy: Story = { args: { isBusy: true } };
