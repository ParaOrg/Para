import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

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

/** Verify with nothing typed: the field says what it needs, and nothing is sent. */
export const FieldError: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Verify' }));
    await expect(canvas.getByText('Enter a valid email')).toBeVisible();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

/** Back from the code: the email typed before is still there. */
export const BackFromCode: Story = { args: { initialEmail: 'juan@example.com' } };

/** While the code is being sent: Verify waits. */
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

/** Waiting on the bot check: its box above Verify, which stays off until the check passes. */
export const WaitingForCheck: Story = {
  args: { captcha: { ...NO_CAPTCHA, siteKey: '1x00000000000000000000AA', isReady: false } },
};

/** A short phone: the page scrolls inside the screen instead of running off it. */
export const ShortPhone: Story = {
  decorators: [
    (Story) => (
      <div className="relative h-[560px] w-[360px] overflow-hidden bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
};
