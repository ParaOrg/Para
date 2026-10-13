import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ChangePassword } from './change-password';

/**
 * Fills the three fields and presses Save password. Callers pass passwords of
 * 12 characters or more, the form's own minimum, so the browser lets it submit.
 */
async function submitPasswords(
  canvas: ReturnType<typeof within>,
  current: string,
  next: string,
  confirm: string,
) {
  await userEvent.type(canvas.getByPlaceholderText('Current password'), current);
  await userEvent.type(canvas.getByPlaceholderText('New password'), next);
  await userEvent.type(canvas.getByPlaceholderText('Confirm new password'), confirm);
  await userEvent.click(canvas.getByRole('button', { name: 'Save password' }));
}

const meta = {
  title: 'Features/Studio/ChangePassword',
  component: ChangePassword,
  // The dialog dims the map it sits over, so give it a map-sized box. The
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
  args: { email: 'owner@example.com', onDone: fn() },
} satisfies Meta<typeof ChangePassword>;

export default meta;
type Story = StoryObj<typeof meta>;

/** From the pill's Password: who is signed in, and the three fields. */
export const Default: Story = {};

/** Cancel closes it, nothing changed. */
export const Cancelled: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Cancel' }));
    await expect(args.onDone).toHaveBeenCalledOnce();
  },
};

/** The two new passwords differ: refused before anything is sent. */
export const NewPasswordsDiffer: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitPasswords(canvas, 'Old-password-1', 'New-password-22', 'New-password-23');
    await expect(canvas.getByText('The two new passwords do not match.')).toBeVisible();
  },
};

/** The new password is the current one: refused before anything is sent. */
export const SameAsCurrent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitPasswords(canvas, 'Same-password-1', 'Same-password-1', 'Same-password-1');
    await expect(
      canvas.getByText('The new password is the same as the current one.'),
    ).toBeVisible();
  },
};

/** A long address: it wraps inside the card rather than running past it. */
export const LongEmail: Story = {
  args: { email: 'maria.clara.delos.santos-ibarra.transport.planning@quezoncity.example.gov.ph' },
};

/** At phone width. */
export const Phone: Story = { parameters: { phone: true } };
