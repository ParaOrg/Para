import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { NO_CAPTCHA } from './account-stories-args';
import { ChangePasswordScreen } from './change-password-screen';

const meta = {
  title: 'Features/Contribute/ChangePasswordScreen',
  component: ChangePasswordScreen,
  parameters: { layout: 'fullscreen' },
  args: {
    isBusy: false,
    error: null,
    oldPasswordError: null,
    captcha: NO_CAPTCHA,
    onSubmit: fn(),
    onForgotPassword: fn(),
    onBack: fn(),
  },
  decorators: [
    (Story) => (
      <div className="relative h-[852px] w-[393px] overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChangePasswordScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty: no Save changes until something is typed. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 1, name: 'Change password' })).toHaveFocus();
    await expect(canvas.queryByRole('button', { name: 'Save changes' })).toBeNull();
  },
};

/** Figma's third frame: typed, Save changes and Cancel rise; the new one checked twice. */
export const Typed: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Old password'), 'oldpass123');
    await userEvent.type(canvas.getByLabelText('New password'), 'newpass456');
    await userEvent.type(canvas.getByLabelText('Confirm password'), 'newpass457');
    await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }));
    await expect(canvas.getByText("The passwords don't match")).toBeVisible();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

/** Cancel goes back to Account settings. */
export const Cancelled: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Old password'), 'x');
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }));
    await expect(args.onBack).toHaveBeenCalled();
  },
};

/** Forgot password? starts the reset by email. */
export const ForgotPassword: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Forgot password?' }));
    await expect(args.onForgotPassword).toHaveBeenCalled();
  },
};

/** The old password given is not the account's: said on its field. */
export const WrongOldPassword: Story = {
  args: { oldPasswordError: 'That’s not your current password' },
};

/** Saving: the sheet stays up, its Save changes saying so. */
export const Saving: Story = { args: { isBusy: true } };

export const NotChanged: Story = {
  args: { isBusy: false, error: "That's already your password. Choose a new one." },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Old password'), 'x');
    await expect(canvas.getByRole('alert')).toBeVisible();
  },
};

/** Waiting on the bot check: Save changes stays off until it passes. */
export const WaitingForCheck: Story = {
  args: { captcha: { ...NO_CAPTCHA, siteKey: '1x00000000000000000000AA', isReady: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Old password'), 'x');
    await expect(canvas.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  },
};

/** A short, narrow phone: the page scrolls inside the screen instead of running off it. */
export const ShortPhone: Story = {
  decorators: [
    (Story) => (
      <div className="relative h-[560px] w-[360px] overflow-hidden">
        <Story />
      </div>
    ),
  ],
};
