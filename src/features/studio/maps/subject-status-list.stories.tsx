import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClientProvider } from '@tanstack/react-query';
import { expect, fn, spyOn, userEvent, within } from 'storybook/test';

import { createQueryClient } from '@/shared/lib/query-client';

import { SubjectStatusList } from './subject-status-list';
import type { PublicationState } from '../data/publication';
import { reviewKeys } from '../data/review-keys';

const STATE: PublicationState = {
  publishedAt: '2026-11-10T04:00:00Z',
  subjects: [
    {
      id: 'r2',
      kind: 'route',
      label: 'Tala – Novaliches via Zabarte',
      status: 'taken_down',
      revision: 4,
      updatedAt: '2026-11-09T08:00:00Z',
      statusAt: '2026-11-09T08:00:00Z',
    },
  ],
  waiting: [],
};

const meta = {
  title: 'Features/Studio/SubjectStatusList',
  component: SubjectStatusList,
  // A client that already has the routes and places and keeps them: a story has no database.
  decorators: [
    (Story) => {
      const client = createQueryClient();
      client.setQueryDefaults(reviewKeys.publication(), { staleTime: Infinity });
      client.setQueryData(reviewKeys.publication(), STATE);
      return (
        <QueryClientProvider client={client}>
          <div className="w-80 bg-surface-quaternary p-3 font-sn-pro">
            <Story />
          </div>
        </QueryClientProvider>
      );
    },
  ],
  parameters: { layout: 'padded' },
  args: { query: 'tala', onChanged: fn() },
} satisfies Meta<typeof SubjectStatusList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The typed name filters the routes and places read; the look is SubjectStatusView's. */
export const Filtered: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Put back' })).toBeVisible();
  },
};

/** Put back asks first; declined, nothing is sent and nothing waits. */
export const PutBackDeclined: Story = {
  play: async ({ canvasElement }) => {
    const confirm = spyOn(window, 'confirm').mockReturnValue(false);
    const button = within(canvasElement).getByRole('button', { name: 'Put back' });
    await userEvent.click(button);
    await expect(confirm).toHaveBeenCalledOnce();
    await expect(button).toBeEnabled();
    await expect(within(canvasElement).getByRole('status')).toBeEmptyDOMElement();
  },
};
