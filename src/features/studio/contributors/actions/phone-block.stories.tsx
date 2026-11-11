import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { createQueryClient } from '@/shared/lib/query-client';

import { PhoneBlock } from './phone-block';
import { contributionKeys } from '../../data/contribution-keys';
import type { ContributorInfo } from '../../data/contributor-read';

const PHONE = 'a697d4aa-0000-4000-8000-000000000001';

/**
 * A client that already has the phone and keeps it, so the story needs no database: without
 * staleTime the card would read the phone again as it mounts, and fail with none.
 */
const withPhone = (info: ContributorInfo | null) => (Story: () => React.JSX.Element) => {
  const client = createQueryClient();
  if (info) {
    client.setQueryDefaults(contributionKeys.phone(PHONE), { staleTime: Infinity });
    client.setQueryData(contributionKeys.phone(PHONE), info);
  }
  return (
    <QueryClientProvider client={client}>
      <div className="w-96 bg-surface p-4 font-sn-pro text-sm text-content-secondary">
        <Story />
      </div>
    </QueryClientProvider>
  );
};

/**
 * A client whose read of the phone failed, with or without what an earlier read gave. It does not
 * read again on mount, so the story shows the failure; Try again starts a read that never answers.
 */
function failedClient(info: ContributorInfo | null): QueryClient {
  const client = createQueryClient();
  client.setQueryDefaults(contributionKeys.phone(PHONE), {
    staleTime: Infinity,
    retryOnMount: false,
  });
  client.getQueryCache().build(
    client,
    { queryKey: contributionKeys.phone(PHONE) },
    {
      data: info ?? undefined,
      dataUpdateCount: info ? 1 : 0,
      dataUpdatedAt: info ? Date.now() : 0,
      error: new Error('The network dropped.'),
      errorUpdateCount: 1,
      errorUpdatedAt: Date.now(),
      fetchFailureCount: 1,
      fetchFailureReason: null,
      fetchMeta: null,
      isInvalidated: false,
      status: 'error',
      fetchStatus: 'idle',
    },
  );
  return client;
}

const withClient = (client: QueryClient) => (Story: () => React.JSX.Element) => (
  <QueryClientProvider client={client}>
    <div className="w-96 bg-surface p-4 font-sn-pro text-sm text-content-secondary">
      <Story />
    </div>
  </QueryClientProvider>
);

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

/** The first read failed: nothing to show but why, and Try again. */
export const FirstReadFailed: Story = {
  decorators: [withClient(failedClient(null))],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent('Phone a697d4 could not be read.');
    await expect(canvas.getByRole('button', { name: 'Try again' })).toBeVisible();
  },
};

const refreshFailed = failedClient({ uploadCount: 14, blockedAt: null, blockNote: '' });

/** A later read failed: the phone stays as last read, Block still works, and a quiet notice says so. */
export const RefreshFailed: Story = {
  decorators: [withClient(refreshFailed)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Phone a697d4 has sent 14 uploads.')).toBeVisible();
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Couldn’t refresh phone a697d4. Showing what was last read.',
    );
    await expect(canvas.queryByRole('alert')).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Block phone' })).toBeEnabled();
  },
};

/** A later read failed on a blocked phone: the notice sits above when it was blocked, and Unblock. */
export const RefreshFailedBlocked: Story = {
  decorators: [
    withClient(
      failedClient({
        uploadCount: 14,
        blockedAt: Date.UTC(2026, 9, 19, 4, 0, 0),
        blockNote: 'Sends rides that are walks',
      }),
    ),
  ],
};

/** A later read failed while the editor is asking why to block: the notice sits in the question. */
export const RefreshFailedAsking: Story = {
  decorators: [withClient(failedClient({ uploadCount: 14, blockedAt: null, blockNote: '' }))],
  play: async (context) => {
    await Asking.play?.(context);
    await expect(within(context.canvasElement).getByRole('status')).not.toBeEmptyDOMElement();
  },
};

const tryAgain = failedClient({ uploadCount: 14, blockedAt: null, blockNote: '' });
/** How many reads of the phone began: Try again starts one. */
let readsBegun = 0;
tryAgain.getQueryCache().subscribe((event) => {
  if (event.type === 'updated' && event.action.type === 'fetch') readsBegun += 1;
});

/** Try again reads the phone again; the phone stays shown while it does. */
export const TryAgain: Story = {
  decorators: [withClient(tryAgain)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const before = readsBegun;
    await userEvent.click(canvas.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(readsBegun).toBe(before + 1));
    await expect(canvas.getByText('Phone a697d4 has sent 14 uploads.')).toBeVisible();
  },
};
