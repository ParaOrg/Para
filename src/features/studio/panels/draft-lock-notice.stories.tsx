import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { DraftLockNotice } from './draft-lock-notice';

const meta = {
  title: 'Features/Studio/DraftLockNotice',
  component: DraftLockNotice,
  args: { lock: { state: 'other', name: 'Marisol' }, onRetry: () => undefined },
} satisfies Meta<typeof DraftLockNotice>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ChangedByName: Story = {};
export const NoNameOnFile: Story = { args: { lock: { state: 'other', name: null } } };
export const Checking: Story = { args: { lock: { state: 'checking' } } };
export const CouldNotCheck: Story = { args: { lock: { state: 'unknown' } } };

/** Another editor's draft, which any editor may approve as it stands. */
export const WithApprove: Story = {
  args: { onApprove: fn() },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Approve' }));
    await expect(args.onApprove).toHaveBeenCalled();
  },
};

/** Approving: the button says so, and cannot be pressed twice. */
export const Approving: Story = {
  args: { onApprove: fn(), isApproving: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Approving…' })).toBeDisabled();
  },
};

/** Approve refused: why, in an alert. */
export const ApproveRefused: Story = {
  args: {
    onApprove: fn(),
    error: 'Someone changed this draft. Refresh it before acting again.',
  },
};

/** Still checking whose draft it is: no Approve yet. */
export const CheckingWithApprove: Story = {
  args: { lock: { state: 'checking' }, onApprove: fn() },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: 'Approve' })).toBeNull();
  },
};

const FROM = new Date('2026-12-05T10:00:00Z');

/** Another editor's draft younger than 7 days: no Discard, one line saying from when. */
export const DiscardLaterLine: Story = {
  args: { onApprove: fn(), onDiscard: fn(), otherDiscard: { state: 'wait', from: FROM } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/^You can discard this from \d+ \w+ if it isn't changed\.$/),
    ).toBeVisible();
    await expect(canvas.queryByRole('button', { name: /^Discard/ })).toBeNull();
  },
};

/** The same, when the draft's stamp could not be read: no date. */
export const DiscardLaterNoDate: Story = {
  args: { onApprove: fn(), otherDiscard: { state: 'wait', from: null } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(
        'You can discard this once it has gone 7 days without a change.',
      ),
    ).toBeVisible();
  },
};

/** The line at a handset's width, where it wraps. */
export const DiscardLaterLinePhone: Story = {
  args: { onApprove: fn(), onDiscard: fn(), otherDiscard: { state: 'wait', from: FROM } },
  decorators: [
    (Story) => (
      <div className="@container w-[390px] bg-surface-quaternary p-3">
        <div className="rounded-xl bg-surface p-4">
          <Story />
        </div>
      </div>
    ),
  ],
};

/** Still checking whose draft it is: no Discard yet, whatever the age. */
export const CheckingWithDiscard: Story = {
  args: {
    lock: { state: 'checking' },
    onDiscard: fn(),
    otherDiscard: { state: 'ready' },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: /^Discard/ })).toBeNull();
  },
};

/** Another editor's draft that has gone 7 days without a change: Discard…, which asks first. */
export const DiscardReady: Story = {
  args: { onApprove: fn(), onDiscard: fn(), otherDiscard: { state: 'ready' } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(/You can discard this/)).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Discard…' }));
    await expect(args.onDiscard).toHaveBeenCalled();
  },
};

/** Discarding: the button says so, and neither it nor Approve can be pressed again. */
export const Discarding: Story = {
  args: { onApprove: fn(), onDiscard: fn(), otherDiscard: { state: 'ready' }, isDiscarding: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Discarding…' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Approve' })).toBeDisabled();
  },
};

/** The database refused: the draft was changed after the card opened. */
export const DiscardRefused: Story = {
  args: {
    onApprove: fn(),
    onDiscard: fn(),
    otherDiscard: { state: 'ready' },
    error:
      "Nothing was discarded. This draft was changed in the last 7 days. You can discard this from 5 Dec if it isn't changed.",
  },
};
