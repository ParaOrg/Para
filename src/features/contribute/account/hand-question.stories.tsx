import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { HandQuestion } from './hand-question';

const meta = {
  title: 'Features/Contribute/HandQuestion',
  component: HandQuestion,
  parameters: { layout: 'fullscreen' },
  args: {
    title: 'Do you want to delete your account?',
    text: 'This can’t be undone.',
    error: null,
    confirmLabel: 'Delete this account',
    confirmVariant: 'error',
    busyLabel: 'Deleting…',
    cancelLabel: 'No, I change my mind',
    isBusy: false,
    onConfirm: fn(),
    onCancel: fn(),
  },
  decorators: [
    (Story) => (
      <div className="relative h-[852px] w-[393px] overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HandQuestion>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Delete account's question (4543:5154), focus on the safe answer. */
export const Delete: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'No, I change my mind' })).toHaveFocus();
  },
};

/** Logout's question (4521:3500), its answer in brand blue. */
export const Logout: Story = {
  args: {
    title: 'Are you sure you want to logout?',
    text: null,
    confirmLabel: 'Logout',
    confirmVariant: 'primary',
    busyLabel: 'Logging out…',
    cancelLabel: 'Cancel',
  },
};

/**
 * Delete this record's question (4569:5015): the title alone, Keep recording leading in brand
 * blue and the act under it in plain red words. Focus is on Keep recording all the same.
 */
export const KeepFirst: Story = {
  args: {
    title: 'You want to remove this recording?',
    text: null,
    confirmLabel: 'Delete this record',
    confirmVariant: 'plain-error',
    busyLabel: 'Delete this record',
    cancelLabel: 'Keep recording',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Keep recording' })).toHaveFocus();
  },
};

/** The answer on its way: it says so, and neither answer can be pressed. */
export const Busy: Story = {
  args: { isBusy: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'No, I change my mind' })).toBeDisabled();
  },
};

/** The answer failed: one line, said where the person is. */
export const Failed: Story = {
  args: { error: 'No signal — try again when you’re online.' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent('No signal');
  },
};

/** A long question and line, on a phone. */
export const LongContent: Story = {
  args: {
    title: 'Do you want to delete your account and everything Para keeps with it?',
    text: 'This can’t be undone. Your commute statistics and all recordings on this phone will be deleted too.',
  },
};
