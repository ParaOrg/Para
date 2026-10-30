import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { NO_CAPTCHA } from './account-stories-args';
import { VerifyCodeScreen } from './verify-code-screen';

const meta = {
  title: 'Features/Contribute/VerifyCodeScreen',
  component: VerifyCodeScreen,
  args: {
    email: 'villanueva2@gmail.com',
    isBusy: false,
    isResending: false,
    error: null,
    captcha: NO_CAPTCHA,
    onSubmit: fn(),
    onResend: fn(),
    onBack: fn(),
  },
  decorators: [
    (Story) => (
      <div className="relative h-[852px] w-[393px] overflow-hidden bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VerifyCodeScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma 4461:4762: the email masked, as vill******2@gmail.com. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText('Enter the verification code sent to vill******2@gmail.com'),
    ).toBeVisible();
  },
};

/** Six digits typed, then Verify: the code goes as digits. */
export const Filled: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Verification code'), '482913');
    await userEvent.click(canvas.getByRole('button', { name: 'Verify' }));
    await expect(args.onSubmit).toHaveBeenCalledWith({ code: '482913' });
  },
};

/** Fewer than six digits: the boxes say so, and nothing is sent. */
export const ShortCode: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Verification code'), '482');
    await userEvent.click(canvas.getByRole('button', { name: 'Verify' }));
    await expect(canvas.getByText('Enter the 6-digit code')).toBeVisible();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

/** Resend sends the code again. */
export const Resend: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Resend' }));
    await expect(args.onResend).toHaveBeenCalledOnce();
  },
};

/** A refused code: one red line above Verify. */
export const CodeRejected: Story = {
  args: { error: 'That code is wrong or has expired. Check it, or send a new code.' },
};

/** While the code is checked: Verify, Resend and Back wait, so the answer is not lost. */
export const Verifying: Story = {
  args: { isBusy: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Back' })).toBeDisabled();
  },
};

/** While a new code is sent. */
export const Resending: Story = { args: { isResending: true } };

/** Waiting on the bot check a Resend needs: its box under Resend, which is off until it passes. */
export const WaitingForCheck: Story = {
  args: { captcha: { ...NO_CAPTCHA, siteKey: '1x00000000000000000000AA', isReady: false } },
};

/** A short email and a short phone: the page scrolls inside the screen. */
export const ShortPhone: Story = {
  args: { email: 'ana@up.edu.ph' },
  decorators: [
    (Story) => (
      <div className="relative h-[560px] w-[360px] overflow-hidden bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
};
