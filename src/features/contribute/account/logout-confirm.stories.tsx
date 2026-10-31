import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { LogoutConfirm } from './logout-confirm';

const meta = {
  title: 'Features/Contribute/LogoutConfirm',
  component: LogoutConfirm,
  parameters: { layout: 'fullscreen' },
  args: { unsentCount: 0, isLoggingOut: false, error: null, onLogout: fn(), onCancel: fn() },
  decorators: [
    (Story) => (
      // A page behind it, so the frost shows.
      <div className="relative h-[852px] w-[393px] overflow-hidden bg-surface font-sn-pro">
        <div aria-hidden className="flex flex-col gap-4 p-5">
          <div className="h-24 rounded-3xl bg-brand-surface" />
          <div className="h-48 rounded-3xl bg-green-700" />
          <div className="h-48 rounded-3xl bg-blue-700" />
        </div>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LogoutConfirm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As the frame has it (4521:3500): the question alone, focus on Cancel. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('alertdialog', { name: 'Are you sure you want to logout?' }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  },
};

/** Recordings not sent yet: one grey line under the question says they stay on this phone. */
export const WithUnsent: Story = {
  args: { unsentCount: 4 },
  play: async ({ canvasElement }) => {
    const dialog = within(within(canvasElement).getByRole('alertdialog'));
    await expect(
      dialog.getByText('4 recordings not sent yet will be left behind on this phone, unsent.'),
    ).toBeVisible();
  },
};

/** Logging out: it says so, and nothing cancels it, not Cancel or Escape; focus stays inside. */
export const Busy: Story = {
  args: { isLoggingOut: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Logging out…' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    await expect(args.onCancel).not.toHaveBeenCalled();
    const dialog = canvas.getByRole('alertdialog');
    await expect(dialog.contains(canvasElement.ownerDocument.activeElement)).toBe(true);
  },
};

/** A Logout that failed: one line inside the question, and Logout to try again. */
export const Failed: Story = {
  args: { error: 'No signal. Try again when you’re online.' },
  play: async ({ canvasElement }) => {
    const dialog = within(within(canvasElement).getByRole('alertdialog'));
    await expect(dialog.getByRole('alert')).toHaveTextContent('No signal');
    await expect(dialog.getByRole('button', { name: 'Logout' })).toBeEnabled();
  },
};
