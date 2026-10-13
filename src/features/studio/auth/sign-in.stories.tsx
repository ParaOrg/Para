import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { SignIn } from './sign-in';

const meta = {
  title: 'Features/Studio/SignIn',
  component: SignIn,
  // The panel dims the map it sits over, so give it a map-sized box. The
  // `phone` parameter gives it a handset's width, as card-actions.stories.tsx
  // does.
  decorators: [
    (Story, ctx) => (
      <div
        className={
          ctx.parameters.phone
            ? 'relative h-160 w-[390px] bg-surface-quaternary'
            : 'relative h-160 bg-surface-quaternary'
        }
      >
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SignIn>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The studio's front door: nothing behind it to go back to, so the way out
 * is a link to the public map, not Cancel.
 */
export const FrontDoor: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Sign in to save' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Public map' })).toHaveAttribute('href', '/');
    await expect(canvas.queryByRole('button', { name: 'Cancel' })).toBeNull();
  },
};

/** Asked for at Done in a test session, over the drawing: Cancel closes it. */
export const AsADialog: Story = {
  args: { onDismiss: fn() },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Cancel' }));
    await expect(args.onDismiss).toHaveBeenCalledOnce();
  },
};

/** Opened with a notice, such as why a reset link was refused: it shows as the error line. */
export const WithANotice: Story = {
  args: {
    notice: 'That reset link has expired or was already used. Ask for a new one below.',
  },
};

/** Forgot password?: the same panel asks only for the email it will send the link to. */
export const ForgotPassword: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Forgot password?' }));
    await expect(canvas.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
    await expect(canvas.queryByPlaceholderText('Password')).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Send reset link' })).toBeEnabled();
  },
};

/** Remembered it?: back to signing in, the email still typed. */
export const RememberedIt: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByPlaceholderText('you@example.com'), 'owner@example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Forgot password?' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }));
    await expect(canvas.getByRole('heading', { name: 'Sign in to save' })).toBeVisible();
    await expect(canvas.getByPlaceholderText('you@example.com')).toHaveValue('owner@example.com');
  },
};

/** A long heading and a long notice: the card grows, the buttons stay at its foot. */
export const LongContent: Story = {
  args: {
    title: 'Sign in to save Tala – SM Fairview via Quirino Highway and Regalado Avenue',
    notice:
      'This reset link was opened on a different device from the one that asked for it. ' +
      'Open it on the phone or computer you asked from, or ask for a new link here.',
    onDismiss: fn(),
  },
};

/** At phone width, the front door as a phone first opens the studio. */
export const Phone: Story = { parameters: { phone: true } };
