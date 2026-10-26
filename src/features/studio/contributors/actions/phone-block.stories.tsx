import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClientProvider } from '@tanstack/react-query';
import { expect, userEvent, within } from 'storybook/test';

import { createQueryClient } from '@/shared/lib/query-client';

import { PhoneBlock } from './phone-block';
import { contributionKeys } from '../../data/contribution-keys';
import type { ContributorInfo } from '../../data/contributor-read';

const PHONE = 'a697d4aa-0000-4000-8000-000000000001';

/** A client that already has the phone, so the story needs no database. */
const withPhone = (info: ContributorInfo | null) => (Story: () => React.JSX.Element) => {
  const client = createQueryClient();
  if (info) client.setQueryData(contributionKeys.phone(PHONE), info);
  return (
    <QueryClientProvider client={client}>
      <div className="w-96 bg-surface p-4 font-sn-pro text-sm text-content-secondary">
        <Story />
      </div>
    </QueryClientProvider>
  );
};

const meta = {
  title: 'Features/Studio/PhoneBlock',
  component: PhoneBlock,
  args: { contributorId: PHONE, phoneCode: 'a697d4' },
} satisfies Meta<typeof PhoneBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {
  decorators: [withPhone({ uploadCount: 14, blockedAt: null, blockNote: '' })],
};

export const OneUpload: Story = {
  decorators: [withPhone({ uploadCount: 1, blockedAt: null, blockNote: '' })],
};

/** Asking why, the note optional and focused. Blocking needs the studio's database, which a story has not. */
export const Asking: Story = {
  decorators: [withPhone({ uploadCount: 14, blockedAt: null, blockNote: '' })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Block phone' }));
    await expect(canvas.getByLabelText('Why block it? (optional)')).toHaveFocus();
  },
};

export const Blocked: Story = {
  decorators: [
    withPhone({
      uploadCount: 14,
      blockedAt: Date.UTC(2026, 9, 19, 4, 0, 0),
      blockNote: 'Sends rides that are walks',
    }),
  ],
};

/** The read is still on its way: the query has no data and the story's database never answers. */
export const Reading: Story = { decorators: [withPhone(null)] };
