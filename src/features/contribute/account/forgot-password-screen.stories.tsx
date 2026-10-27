import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { NO_CAPTCHA } from './account-stories-args';
import { ForgotPasswordScreen } from './forgot-password-screen';

const meta = {
  title: 'Features/Contribute/ForgotPasswordScreen',
  component: ForgotPasswordScreen,
  args: {
    initialEmail: '',
    isBusy: false,
    error: null,
    captcha: NO_CAPTCHA,
    onSubmit: fn(),
    onBack: fn(),
  },
  decorators: [
    (Story) => (
      <div className="relative h-[844px] w-[390px] overflow-hidden bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ForgotPasswordScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Asking for a new code: the email typed before is still there. */
export const NewCode: Story = { args: { initialEmail: 'juan@example.com' } };

/** While the code is being sent: both buttons wait. */
export const Sending: Story = { args: { initialEmail: 'juan@example.com', isBusy: true } };

/** No signal: the same line the page shows for every failed request. */
export const Offline: Story = {
  args: {
    initialEmail: 'juan@example.com',
    error: "No signal — try again when you're online",
  },
};

/** The project turned the send away: waiting is the fix. */
export const TooManyTries: Story = {
  args: {
    initialEmail: 'juan@example.com',
    error: 'Too many tries. Wait a few minutes, then try again.',
  },
};
