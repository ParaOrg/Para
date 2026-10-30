import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { NO_CAPTCHA } from './account-stories-args';
import { CreateAccountScreen } from './create-account-screen';

const meta = {
  title: 'Features/Contribute/CreateAccountScreen',
  component: CreateAccountScreen,
  args: {
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
} satisfies Meta<typeof CreateAccountScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Continue with nothing typed: each field says what it needs, and nothing is sent. */
export const FieldErrors: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
    await expect(canvas.getByText('Enter your name')).toBeVisible();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

/** The number typed after +63 is sent in the form the database stores. */
export const Filled: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Full name'), 'Juan dela Cruz');
    await userEvent.type(canvas.getByLabelText('Email'), 'juan@example.com');
    await userEvent.type(canvas.getByLabelText('Phone Number'), '917 123 4567');
    await userEvent.type(canvas.getByLabelText('Password'), 'hunter2hunter2');
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      name: 'Juan dela Cruz',
      email: 'juan@example.com',
      phone: '+639171234567',
      password: 'hunter2hunter2',
    });
  },
};

/** A refused try: one red line above Continue. */
export const EmailTaken: Story = { args: { error: 'That email already has an account' } };

/** While the request is out: Continue waits. */
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

/** Waiting on the bot check: its box above Continue, which stays off until the check passes. */
export const WaitingForCheck: Story = {
  args: { captcha: { ...NO_CAPTCHA, siteKey: '1x00000000000000000000AA', isReady: false } },
};
