import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { SignInCard } from './sign-in-card';
import type { Captcha } from './use-captcha';

/**
 * The open dialog, to query inside. Found, not got: it opens in an effect, which a built
 * Storybook runs only after the play has begun (install-prompt.stories.tsx).
 */
async function openDialog(canvasElement: HTMLElement) {
  return within(await within(canvasElement.ownerDocument.body).findByRole('dialog'));
}

/** No site key: no widget, and every request may go. */
const NO_CHECK: Captcha = {
  siteKey: null,
  round: 0,
  setToken: fn(),
  isReady: true,
  takeToken: () => ({}),
};

/** Cloudflare's check still working: no token yet, so the buttons that send wait. */
const CHECKING: Captcha = { ...NO_CHECK, isReady: false };

const WRONG_PASSWORD = 'That email and password do not match an account.';

/**
 * The card's states, driven by its props. SignIn's own stories (sign-in.stories.tsx) press
 * through it as a person would.
 */
const meta = {
  title: 'Features/Studio/SignInCard',
  component: SignInCard,
  decorators: [
    (Story) => (
      <div className="h-160 bg-surface">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    title: 'Studio sign in',
    mode: 'signin',
    email: '',
    password: '',
    isBusy: false,
    isSent: false,
    error: null,
    captcha: NO_CHECK,
    onEmailChange: fn(),
    onPasswordChange: fn(),
    onModeChange: fn(),
    onSubmit: fn(),
    onSentDone: fn(),
  },
} satisfies Meta<typeof SignInCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma 4618:10356: the front door, empty. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await openDialog(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    await expect(canvas.getByRole('link', { name: 'Public map' })).toHaveAttribute('href', '/');
    await expect(canvas.getByRole('button', { name: 'Forgot password' })).toBeEnabled();
  },
};

/** Sent and waiting for Supabase: Signing in…, dimmed. */
export const Loading: Story = {
  args: { email: 'owner@example.com', password: 'hunter22', isBusy: true },
  play: async ({ canvasElement }) => {
    const canvas = await openDialog(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Signing in…' })).toBeDisabled();
  },
};

/** Figma 4618:10526: both fields red, the one message under Password. */
export const WithError: Story = {
  args: { email: 'owner@example.com', password: 'hunter22', error: WRONG_PASSWORD },
  play: async ({ canvasElement }) => {
    const canvas = await openDialog(canvasElement);
    await expect(canvas.getByRole('textbox', { name: 'Email' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(canvas.getByLabelText('Password', { exact: true })).toHaveAccessibleDescription(
      WRONG_PASSWORD,
    );
    await expect(canvas.getAllByText(WRONG_PASSWORD)).toHaveLength(1);
  },
};

/** Opened with a notice that is not about what was typed: under Password, the fields as they are. */
export const WithANotice: Story = {
  args: { notice: 'Reset link problem: the link has expired. Ask for a new one below.' },
  play: async ({ canvasElement }) => {
    const canvas = await openDialog(canvasElement);
    await expect(canvas.getByLabelText('Password', { exact: true })).not.toHaveAttribute(
      'aria-invalid',
    );
  },
};

/** Turnstile still checking: Sign in waits, dimmed, until the check passes. */
export const Disabled: Story = {
  args: { email: 'owner@example.com', password: 'hunter22', captcha: CHECKING },
  play: async ({ canvasElement }) => {
    const canvas = await openDialog(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  },
};

/** Over a drawing, at Done in a test session: Sign in to save, and Cancel closes it. */
export const OverADrawing: Story = {
  args: { title: 'Sign in to save', onDismiss: fn() },
  play: async ({ canvasElement }) => {
    const canvas = await openDialog(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    await expect(canvas.queryByRole('link', { name: 'Public map' })).toBeNull();
  },
};

/** Forgot password: the email the reset link goes to. */
export const ForgotPassword: Story = { args: { mode: 'forgot' } };

/** Forgot password, sending. */
export const ForgotPasswordLoading: Story = {
  args: { mode: 'forgot', email: 'owner@example.com', isBusy: true },
};

/** Forgot password refused: the message under Email, the one field it can be about. */
export const ForgotPasswordError: Story = {
  args: {
    mode: 'forgot',
    email: 'owner@example',
    error: 'That email was not accepted. Check it and try again.',
  },
};

/** The reset link went. */
export const CheckYourEmail: Story = {
  args: { mode: 'forgot', email: 'owner@example.com', isSent: true },
};

/** A long heading, a long email and a long message: the card grows, the logo keeps its size. */
export const LongContent: Story = {
  args: {
    title: 'Sign in to save Tala – SM Fairview via Quirino Highway and Regalado Avenue',
    email: 'a.very.long.editor.address.for.para@example-organisation.ph',
    error:
      'This reset link was opened on a different device from the one that asked for it. ' +
      'Open it on the phone or computer you asked from, or ask for a new link here.',
    onDismiss: fn(),
  },
};

/** At phone width: the same card, full width with 16 px either side. */
export const Phone: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } } };
