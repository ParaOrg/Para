import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

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

/** Sign in with nothing typed: each field says what it needs, and nothing is sent. */
export const FieldErrors: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }));
    await expect(canvas.getByText('Enter a valid email')).toBeVisible();
    await expect(canvas.getByText('Enter your password')).toBeVisible();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

/** A refused try: one red line above Sign in. */
export const WrongPassword: Story = { args: { error: 'Wrong email or password' } };

/** No signal: the same line the page shows for every failed request. */
export const Offline: Story = {
  args: { error: "No signal — try again when you're online" },
};

/** While the request is out: every button waits. */
export const Busy: Story = { args: { isBusy: true } };

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

/** Waiting on the bot check: its box above Sign in, which stays off until the check passes. */
export const WaitingForCheck: Story = {
  args: { captcha: { ...NO_CAPTCHA, siteKey: '1x00000000000000000000AA', isReady: false } },
};

/** Cloudflare asks for a tap: one line above Sign in says where the check is. */
export const CheckAsksForTap: Story = {
  args: {
    captcha: {
      ...NO_CAPTCHA,
      siteKey: '1x00000000000000000000AA',
      isReady: false,
      needsTap: true,
    },
  },
};
