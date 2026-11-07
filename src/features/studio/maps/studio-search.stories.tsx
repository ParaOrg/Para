import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { Hotspot } from '@/features/routes/model/hotspots';
import type { LandmarkFileRead } from '@/features/routes/published/fetch-landmarks';

import { StudioSearch } from './studio-search';
import { reviewKeys } from '../data/review-keys';
import type { DraftRow } from '../data/review-schema';

const hotspot = (id: string, name: string, informal: string, at: [number, number]): Hotspot => ({
  id,
  name,
  informal,
  aliases: [],
  kind: 'hintuan',
  point: { type: 'Point', coordinates: at },
  area: null,
  note: null,
  createdAt: '2026-01-01T00:00:00Z',
  line: null,
});

const LANDMARKS: LandmarkFileRead = {
  attribution: '© OpenStreetMap contributors',
  landmarks: [
    {
      id: 'w1',
      name: 'Ayala Malls TriNoma',
      kind: 'mall',
      point: [121.0335, 14.6535],
      reach: [[121.0335, 14.6535]],
      aliases: ['TriNoma'],
    },
  ],
};

/** A new place still in a draft: not on the map, found by search and marked "Draft". */
const NEW_PLACE_DRAFT: DraftRow = {
  id: 'draft-1',
  kind: 'hotspot',
  subject_id: 'new-1',
  is_new: true,
  base_revision: null,
  revision: 1,
  status: 'draft',
  payload: {
    version: 1,
    stop: {
      name: 'Litex Market Hintuan',
      informal: 'Litex',
      aliases: [],
      kind: 'hintuan',
      note: null,
      area: {
        type: 'Polygon',
        coordinates: [
          [
            [121.096, 14.7],
            [121.097, 14.7],
            [121.097, 14.701],
            [121.096, 14.7],
          ],
        ],
      },
      point: { type: 'Point', coordinates: [121.0965, 14.7005] },
      line: null,
    },
    links: [],
  },
  note: null,
  editor_id: 'e1',
  created_at: '2026-11-07T00:00:00Z',
  updated_at: '2026-11-07T00:00:00Z',
  submitted_at: null,
};

/** The studio's query cache with the drafts already read, as the review list leaves it. */
function WithDrafts({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    const next = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    next.setQueryData(reviewKeys.drafts(), [NEW_PLACE_DRAFT]);
    return next;
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const meta = {
  title: 'Features/Studio/StudioSearch',
  component: StudioSearch,
  args: {
    map: null,
    hotspots: [
      hotspot('h1', 'Cubao Farmers', 'Cubao', [121.054, 14.619]),
      hotspot('h2', 'MRT-3 North Avenue Station', 'North Avenue', [121.032, 14.652]),
    ],
    directionsAt: () => [],
    isSignedIn: false,
    isDrawing: false,
    onOpenHotspot: fn(),
    loadLandmarks: () => Promise.resolve(LANDMARKS),
  },
  // The studio's map box at a computer's size: the bar shows from @float up.
  decorators: [
    (Story) => (
      <WithDrafts>
        <div className="@container relative h-120 w-275 bg-surface-tertiary">
          <Story />
        </div>
      </WithDrafts>
    ),
  ],
} satisfies Meta<typeof StudioSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

const field = (canvasElement: HTMLElement) =>
  within(canvasElement).getByRole('combobox', { name: 'Search places' });

/** At rest: the field at the top of the map. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(field(canvasElement)).toBeVisible();
  },
};

/** A hotspot chosen with nothing drawn: its card opens, as a tap on its box does. */
export const OpensItsCard: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.type(field(canvasElement), 'cubao');
    await userEvent.keyboard('{Enter}');
    await expect(args.onOpenHotspot).toHaveBeenCalledWith('h1');
  },
};

/** While a line is drawn: a hotspot chosen only moves the camera; no card opens (decision 46). */
export const WhileDrawing: Story = {
  args: { isDrawing: true },
  play: async ({ args, canvasElement }) => {
    await userEvent.type(field(canvasElement), 'cubao');
    await userEvent.keyboard('{Enter}');
    await expect(args.onOpenHotspot).not.toHaveBeenCalled();
    await expect(field(canvasElement)).toHaveValue('');
  },
};

/** A landmark, listed after the studio's places, with the credit; choosing it lists no routes. */
export const Landmark: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.type(field(canvasElement), 'trinoma');
    await waitFor(() =>
      expect(within(canvasElement).getAllByRole('option')[0]).toHaveTextContent('Ayala Malls'),
    );
    await expect(within(canvasElement).getByText('© OpenStreetMap contributors')).toBeVisible();
    await userEvent.keyboard('{Enter}');
    await expect(within(canvasElement).queryByRole('region')).toBeNull();
    await expect(args.onOpenHotspot).not.toHaveBeenCalled();
  },
};

/** Signed in: a new place still in a draft is found, marked "Draft"; it has no card yet, so none opens. */
export const Draft: Story = {
  args: { isSignedIn: true },
  play: async ({ args, canvasElement }) => {
    await userEvent.type(field(canvasElement), 'litex');
    const [row] = within(canvasElement).getAllByRole('option');
    await expect(row).toHaveTextContent('LitexDraft');
    await userEvent.keyboard('{Enter}');
    await expect(args.onOpenHotspot).not.toHaveBeenCalled();
  },
};

/** Signed out: no drafts are read, so the draft place is not found. */
export const SignedOutNoDrafts: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(field(canvasElement), 'litex');
    await expect(
      await within(canvasElement).findByText('No place called ‘litex’ yet', {
        selector: 'p:not([role])',
      }),
    ).toBeVisible();
  },
};

/** The Contributors map: no cards there, so a hotspot chosen only moves the camera. */
export const ContributorsMap: Story = {
  args: { onOpenHotspot: undefined },
  play: async ({ canvasElement }) => {
    await userEvent.type(field(canvasElement), 'cubao');
    await userEvent.keyboard('{Enter}');
    await expect(field(canvasElement)).toHaveValue('');
  },
};
