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
    rejection: null,
    error: null,
    resendError: null,
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

/** The sixth digit sends the code, with no button to press. */
export const Filled: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Verification code'), '48291');
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await userEvent.type(canvas.getByLabelText('Verification code'), '3');
    await expect(args.onSubmit).toHaveBeenCalledOnce();
    await expect(args.onSubmit).toHaveBeenCalledWith({ code: '482913' });
    await expect(canvas.queryByRole('button', { name: 'Verify' })).toBeNull();
  },
};

/** A pasted code is sent the same way. */
export const Pasted: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByLabelText('Verification code'));
    await userEvent.paste('Your code: 482 913');
    await expect(args.onSubmit).toHaveBeenCalledOnce();
    await expect(args.onSubmit).toHaveBeenCalledWith({ code: '482913' });
  },
};

/** Enter with fewer than six digits: the boxes say so, and nothing is sent. */
export const ShortCode: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Verification code'), '482{Enter}');
    await expect(canvas.getByText('Enter the 6-digit code')).toBeVisible();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

/** After that line, typing goes on from the digits there: only a refusal starts afresh. */
export const ShortCodeThenTyping: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const field = canvas.getByLabelText('Verification code');
    await userEvent.type(field, '482{Enter}');
    await expect(canvas.getByText('Enter the 6-digit code')).toBeVisible();
    await userEvent.type(field, '9');
    await expect(field).toHaveValue('4829');
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

/** A Resend that failed: its line shows, and the boxes are left as they were. */
export const ResendFailed: Story = {
  args: { resendError: "No signal — try again when you're online" },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const field = canvas.getByLabelText('Verification code');
    await expect(field).not.toHaveFocus();
    await expect(canvas.getByRole('alert')).toHaveTextContent('No signal');
    await userEvent.type(field, '482913');
    await userEvent.click(field);
    await expect(args.onSubmit).toHaveBeenCalledOnce();
  },
};

/** Resend sends the code again. */
export const Resend: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Resend' }));
    await expect(args.onResend).toHaveBeenCalledOnce();
  },
};

/** A refused code: the boxes shake once and go red, the line under them read out. */
export const CodeRejected: Story = {
  args: {
    rejection: {
      message: 'That code is wrong or has expired. Check it, or send a new code.',
      key: 1,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText('Verification code')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(canvas.getAllByRole('alert').map((alert) => alert.textContent)).toContain(
      'That code is wrong or has expired. Check it, or send a new code.',
    );
  },
};

/** After a refusal, the next digit starts the code again, and the red goes. */
export const TypingAfterRejection: Story = {
  args: CodeRejected.args,
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByLabelText('Verification code');
    await userEvent.type(field, '5');
    await expect(field).toHaveValue('5');
    await expect(field).not.toHaveAttribute('aria-invalid');
  },
};

/** Another failure (no signal): one line, no shake, no red; the digits stay to try again. */
export const NoSignal: Story = {
  args: { error: "No signal — try again when you're online" },
  play: async ({ args, canvasElement }) => {
    const field = within(canvasElement).getByLabelText('Verification code');
    await expect(field).not.toHaveAttribute('aria-invalid');
    await userEvent.type(field, '482913');
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
    await userEvent.click(field);
    await expect(args.onSubmit).toHaveBeenCalledTimes(2);
  },
};

/** While the code is checked: the boxes, Resend and Back wait, and a line says why. */
export const Verifying: Story = {
  args: { isBusy: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Back' })).toBeDisabled();
    await expect(canvas.getByLabelText('Verification code')).toBeDisabled();
    await expect(canvas.getByRole('status')).toHaveTextContent('Checking the code…');
  },
};

/** While a new code is sent: the boxes wait too, so a full code is never left unsent. */
export const Resending: Story = {
  args: { isResending: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText('Verification code')).toBeDisabled();
  },
};

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
