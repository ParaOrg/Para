import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { AuthDialogs } from './auth-dialogs';

const meta = {
  title: 'Features/Studio/AuthDialogs',
  component: AuthDialogs,
  // The dialogs dim the map they sit over, so give them a map-sized box. The
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
  args: {
    signingIn: false,
    onSignInDismiss: fn(),
    resetting: false,
    onResetDone: fn(),
    changingPasswordFor: null,
    onPasswordDone: fn(),
  },
} satisfies Meta<typeof AuthDialogs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No flag up, the usual case: nothing over the map. */
export const None: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('heading')).toBeNull();
  },
};

/** Sign in, from the pill or asked for at Done: a dialog, so it has Cancel. */
export const SigningIn: Story = {
  args: { signingIn: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Sign in to save' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Cancel' })).toBeVisible();
  },
};

/** Back from a reset link: choose a new password. */
export const Resetting: Story = {
  args: { resetting: true },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('heading', { name: 'Choose a new password' }),
    ).toBeVisible();
  },
};

/** From the pill's Password: change it, for the signed-in email. */
export const ChangingPassword: Story = {
  args: { changingPasswordFor: 'owner@example.com' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Change password' })).toBeVisible();
    await expect(canvas.getByText('Signed in as owner@example.com.')).toBeVisible();
  },
};

/** At phone width, signing in. */
export const Phone: Story = { args: { signingIn: true }, parameters: { phone: true } };
