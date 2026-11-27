import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Session } from '@supabase/supabase-js';
import { QueryClientProvider } from '@tanstack/react-query';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { HotspotRow } from '@/features/routes/model/hotspots';
import { createQueryClient } from '@/shared/lib/query-client';

import { DraftPlaceCard } from './draft-place-card';
import { StudioSessionContext } from '../auth/use-studio-session';
import { editorKeys } from '../data/editor-keys';
import { reviewKeys } from '../data/review-keys';
import type { DraftRow } from '../data/review-schema';

/** The editor's own draft of a new hintuan: no approved row yet. */
const OWN: DraftRow = {
  id: 'draft-1',
  kind: 'hotspot',
  subject_id: 'new-place',
  is_new: true,
  base_revision: null,
  revision: 1,
  status: 'draft',
  payload: { version: 1, stop: { name: 'Lagro Kanto' }, links: [] },
  note: null,
  editor_id: 'me',
  created_at: '2026-11-27T08:00:00Z',
  updated_at: '2026-11-27T08:00:00Z',
  submitted_at: null,
};

/** The same place, drafted by another editor. */
const ANOTHERS: DraftRow = { ...OWN, editor_id: 'marisol' };

const HINTUAN: HotspotRow = {
  id: 'new-place',
  name: 'Lagro Kanto',
  informal: null,
  aliases: [],
  kind: 'hintuan',
  point: { type: 'Point', coordinates: [121.06, 14.73] },
  area: null,
  note: null,
  createdAt: '2026-11-27T08:00:00Z',
};

/** The editor looking: signed in as `me`. */
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

/**
 * A client that already has the stored draft (another editor's, which Approve reads) and the
 * makers' names, and keeps them: a story has no database.
 */
function withEditor(Story: () => React.JSX.Element) {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { staleTime: Infinity, retry: false } });
  client.setQueryData(reviewKeys.draftOf('hotspot', 'new-place'), ANOTHERS);
  client.setQueryData(editorKeys.names(), new Map([['marisol', 'Marisol']]));
  return (
    <QueryClientProvider client={client}>
      <StudioSessionContext value={SESSION}>
        <div className="relative h-72 w-96 bg-surface-quaternary">
          <Story />
        </div>
      </StudioSessionContext>
    </QueryClientProvider>
  );
}

const meta = {
  title: 'Features/Studio/DraftPlaceCard',
  component: DraftPlaceCard,
  decorators: [withEditor],
  parameters: { layout: 'padded' },
  args: { draft: OWN, hotspot: HINTUAN, onEdit: fn(), onApproved: fn(), onClose: fn() },
} satisfies Meta<typeof DraftPlaceCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The editor's own draft of a hintuan: its name, Kind and Status Draft, and Edit hintuan, which
 * opens the editor. Focus starts on its name; Escape closes it.
 */
export const OwnHintuan: Story = {
  play: async ({ args, canvasElement }) => {
    const card = within(canvasElement);
    await waitFor(() => expect(card.getByRole('heading', { name: 'Lagro Kanto' })).toHaveFocus());
    await expect(card.getByText('Hintuan')).toBeVisible();
    await expect(card.getByText('Draft')).toHaveClass('text-text-error');
    await userEvent.click(card.getByRole('button', { name: 'Edit hintuan' }));
    await expect(args.onEdit).toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalled();
  },
};

/** A terminal: its Kind and Edit say so. */
export const OwnTerminal: Story = {
  args: { hotspot: { ...HINTUAN, name: 'Lagro Terminal', kind: 'terminal' } },
  play: async ({ canvasElement }) => {
    const card = within(canvasElement);
    await expect(card.getByText('Terminal')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Edit terminal' })).toBeVisible();
  },
};

/** Another editor's draft: who is changing it, and Approve; no Edit. */
export const AnotherEditors: Story = {
  args: { draft: ANOTHERS },
  play: async ({ canvasElement }) => {
    const card = within(canvasElement);
    await expect(await card.findByText(/Being changed by Marisol/)).toBeVisible();
    await expect(card.queryByRole('button', { name: /^Edit/ })).toBeNull();
    await expect(card.getByRole('button', { name: 'Approve' })).toBeEnabled();
  },
};

/** A long name wraps beside Close. */
export const LongName: Story = {
  args: {
    hotspot: { ...HINTUAN, name: 'Bagong Silang Phase 5 Kanan Barangay Hall Loading Bay' },
  },
};
