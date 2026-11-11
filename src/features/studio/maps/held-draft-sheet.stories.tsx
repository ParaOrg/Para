import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Session } from '@supabase/supabase-js';
import { QueryClientProvider } from '@tanstack/react-query';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { createQueryClient } from '@/shared/lib/query-client';

import { HeldDraftSheet } from './held-draft-sheet';
import { StudioSessionContext } from '../auth/use-studio-session';
import { editorKeys } from '../data/editor-keys';
import { reviewKeys } from '../data/review-keys';
import type { DraftRow } from '../data/review-schema';

/** Another editor's draft of a new place: no approved row, so no card to open. */
const DRAFT: DraftRow = {
  id: 'draft-1',
  kind: 'hotspot',
  subject_id: 'new-place',
  is_new: true,
  base_revision: null,
  revision: 2,
  status: 'draft',
  payload: { version: 1, stop: { name: 'Lagro Terminal' }, links: [] },
  note: null,
  editor_id: 'marisol',
  created_at: '2026-11-09T08:00:00Z',
  updated_at: '2026-11-09T09:00:00Z',
  submitted_at: null,
};

/** The editor looking: signed in, not the draft's maker. */
const SESSION: Session = {
  access_token: 'story',
  refresh_token: 'story',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'me',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-11-01T00:00:00Z',
  },
};

/** A client that already has the draft and the maker's name, and keeps them: a story has no database. */
const withEditor =
  (names: ReadonlyMap<string, string> | null) => (Story: () => React.JSX.Element) => {
    const client = createQueryClient();
    client.setDefaultOptions({ queries: { staleTime: Infinity, retry: false } });
    client.setQueryData(reviewKeys.draftOf('hotspot', 'new-place'), DRAFT);
    if (names) client.setQueryData(editorKeys.names(), names);
    return (
      <QueryClientProvider client={client}>
        <StudioSessionContext value={SESSION}>
          <div className="relative h-64 w-96 bg-surface-quaternary">
            <Story />
          </div>
        </StudioSessionContext>
      </QueryClientProvider>
    );
  };

const meta = {
  title: 'Features/Studio/HeldDraftSheet',
  component: HeldDraftSheet,
  decorators: [withEditor(new Map([['marisol', 'Marisol']]))],
  parameters: { layout: 'padded' },
  args: { draft: DRAFT, places: new Map(), onApproved: fn(), onClose: fn() },
} satisfies Meta<typeof HeldDraftSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Its name, who is changing it and Approve; no Discard, which is the maker's alone. */
export const ByName: Story = {
  play: async ({ canvasElement }) => {
    const sheet = within(canvasElement);
    // Focus moves to its name in an effect, after the first paint.
    await waitFor(() =>
      expect(sheet.getByRole('heading', { name: 'Lagro Terminal' })).toHaveFocus(),
    );
    await expect(await sheet.findByText(/Being changed by Marisol/)).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Approve' })).toBeEnabled();
    await expect(sheet.queryByRole('button', { name: /Discard/ })).toBeNull();
  },
};

/** No name on file for the maker: plain words. */
export const NoNameOnFile: Story = {
  decorators: [withEditor(new Map())],
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(/Being changed by another editor/),
    ).toBeVisible();
  },
};

/** Close, and Escape, close it. */
export const Closes: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Close' }));
    await expect(args.onClose).toHaveBeenCalledOnce();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledTimes(2);
  },
};
