import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ResetPassword } from './reset-password';

const meta = {
  title: 'Features/Studio/ResetPassword',
  component: ResetPassword,
  // The dialog dims the map it sits over, so give it a map-sized box. The
  // `phone` parameter gives it a handset's width, as card-actions.stories.tsx
  // does: a reset link is most often opened from a phone's mail.
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
  args: { onDone: fn() },
} satisfies Meta<typeof ResetPassword>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Back from a reset link, signed in by it: choose the new password. */
export const Default: Story = {};

/** Skip for now keeps the old password and closes the dialog. */
export const Skipped: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Skip for now' }));
    await expect(args.onDone).toHaveBeenCalledOnce();
  },
};

/** The two passwords differ: refused before anything is sent, and the dialog stays. */
export const PasswordsDiffer: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByPlaceholderText('New password'), 'New-password-22');
    await userEvent.type(canvas.getByPlaceholderText('Confirm new password'), 'New-password-23');
    await userEvent.click(canvas.getByRole('button', { name: 'Save password' }));
    await expect(canvas.getByText('The two passwords do not match.')).toBeVisible();
    await expect(args.onDone).not.toHaveBeenCalled();
  },
};

/** Back from an invite: the account's first password, with no Skip. */
export const Invite: Story = {
  args: { isInvite: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Set your password' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Skip for now' })).toBeNull();
  },
};

/** At phone width. */
export const Phone: Story = { parameters: { phone: true } };
