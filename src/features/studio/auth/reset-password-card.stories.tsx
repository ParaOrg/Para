import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { ResetPasswordCard } from './reset-password-card';

/**
 * The open dialog, to query inside. Found, not got: it opens in an effect, which a built
 * Storybook runs only after the play has begun (install-prompt.stories.tsx).
 */
async function openDialog(canvasElement: HTMLElement) {
  return within(await within(canvasElement.ownerDocument.body).findByRole('dialog'));
}

/**
 * The new-password card's states, driven by its props. ResetPassword's own stories
 * (reset-password.stories.tsx) press through it as a person would.
 */
const meta = {
  title: 'Features/Studio/ResetPasswordCard',
  component: ResetPasswordCard,
  decorators: [
    (Story) => (
      <div className="h-160 bg-surface">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    isInvite: false,
    password: '',
    confirm: '',
    isBusy: false,
    error: null,
    onPasswordChange: fn(),
    onConfirmChange: fn(),
    onSubmit: fn(),
    onSkip: fn(),
  },
} satisfies Meta<typeof ResetPasswordCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma 4618:10477, in the link flow's words: back from a reset link. */
export const Default: Story = {};

/** Sent and waiting for Supabase: Saving…, dimmed. */
export const Loading: Story = {
  args: { password: 'New-password-22', confirm: 'New-password-22', isBusy: true },
  play: async ({ canvasElement }) => {
    const canvas = await openDialog(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  },
};

/** The password breaks the rule: the message under New password. */
export const RuleError: Story = {
  args: {
    password: 'only-letters',
    confirm: 'only-letters',
    error: { field: 'password', message: 'Use at least 8 characters, with letters and numbers' },
  },
};

/** Supabase refused it: the message under Confirm new password. */
export const ServerError: Story = {
  args: {
    password: 'New-password-22',
    confirm: 'New-password-22',
    error: {
      field: 'confirm',
      message: 'No connection to Para. Check your internet, then try again.',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = await openDialog(canvasElement);
    await expect(
      canvas.getByLabelText('Confirm new password', { exact: true }),
    ).toHaveAccessibleDescription('No connection to Para. Check your internet, then try again.');
  },
};

/** Back from an invite: the account's first password, with no Skip. */
export const Invite: Story = { args: { isInvite: true } };

/** The invite's longer words and a long message, at phone width: the card grows. */
export const LongContent: Story = {
  args: {
    isInvite: true,
    password: 'New-password-22',
    confirm: 'New-password-22',
    error: {
      field: 'confirm',
      message:
        'That did not go through. Try again in a moment, or ask for a new link from the sign-in.',
    },
  },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
