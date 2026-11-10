import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClientProvider } from '@tanstack/react-query';
import { expect, fn, userEvent, within } from 'storybook/test';

import { createQueryClient } from '@/shared/lib/query-client';

import { SubjectStatusList } from './subject-status-list';
import type { PublicationState, PublicationSubject } from '../data/publication';
import { reviewKeys } from '../data/review-keys';

const subject = (over: Partial<PublicationSubject>): PublicationSubject => ({
  id: 'r1',
  kind: 'route',
  label: 'Tala – SM Fairview',
  status: 'approved',
  revision: 4,
  updatedAt: '2026-11-09T08:00:00Z',
  statusAt: '2026-11-09T08:00:00Z',
  ...over,
});
const STATE: PublicationState = {
  publishedAt: '2026-11-10T04:00:00Z',
  subjects: [
    subject({}),
    subject({ id: 'r2', label: 'Tala – Novaliches via Zabarte', status: 'taken_down' }),
    subject({ id: 'h1', kind: 'hotspot', label: 'Tala Terminal' }),
  ],
  waiting: [],
};

/** A client that already has the routes and places and keeps them: a story has no database. */
const withSubjects = (state: PublicationState | null) => (Story: () => React.JSX.Element) => {
  const client = createQueryClient();
  if (state) {
    client.setQueryDefaults(reviewKeys.publication(), { staleTime: Infinity });
    client.setQueryData(reviewKeys.publication(), state);
  }
  return (
    <QueryClientProvider client={client}>
      <div className="w-80 bg-surface-quaternary p-3 font-sn-pro">
        <Story />
      </div>
    </QueryClientProvider>
  );
};

const meta = {
  title: 'Features/Studio/SubjectStatusList',
  component: SubjectStatusList,
  decorators: [withSubjects(STATE)],
  parameters: { layout: 'padded' },
  args: { query: 'tala', onChanged: fn() },
} satisfies Meta<typeof SubjectStatusList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** "tala" typed: the published route and place offer Take down, the taken-down route Put back. */
export const Matches: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('listitem')).toHaveLength(3);
    await expect(canvas.getAllByRole('button', { name: 'Take down' })).toHaveLength(2);
    await expect(canvas.getByRole('button', { name: 'Put back' })).toBeVisible();
    await expect(canvas.getByText('Route · Taken down')).toBeVisible();
  },
};

/** One letter typed: nothing listed yet. */
export const TooShort: Story = {
  args: { query: 't' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('list')).toBeNull();
  },
};

/** Nothing matches: the list stays away, the place search says so. */
export const NoMatch: Story = {
  args: { query: 'cubao' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('list')).toBeNull();
  },
};

/** Put back asked first; declined, nothing is sent. */
export const PutBackDeclined: Story = {
  play: async ({ args, canvasElement }) => {
    window.confirm = () => false;
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Put back' }));
    await expect(args.onChanged).not.toHaveBeenCalled();
  },
};

/** Still reading the routes and places. */
export const Reading: Story = { decorators: [withSubjects(null)] };
