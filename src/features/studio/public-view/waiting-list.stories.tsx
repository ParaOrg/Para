import type { Meta, StoryObj } from '@storybook/react-vite';

import { WaitingList } from './waiting-list';
import type { PublicationSubject } from '../data/publication';

const meta = {
  title: 'Features/Studio/WaitingList',
  component: WaitingList,
} satisfies Meta<typeof WaitingList>;
export default meta;
type Story = StoryObj<typeof meta>;

const PUBLISHED_AT = '2026-10-18T09:00:00Z';
const subject = (
  id: string,
  kind: PublicationSubject['kind'],
  label: string,
  status: PublicationSubject['status'],
): PublicationSubject => ({
  id,
  kind,
  label,
  status,
  revision: 3,
  updatedAt: '2026-10-18T10:00:00Z',
  statusAt: '2026-10-18T10:00:00Z',
});

export const Default: Story = {
  args: {
    state: {
      status: 'ready',
      publishedAt: PUBLISHED_AT,
      subjects: [
        subject('a', 'hotspot', 'Palma Hall', 'approved'),
        subject('b', 'route', 'Fairview – Capitol', 'taken_down'),
      ],
    },
  },
};
export const Loading: Story = { args: { state: { status: 'loading' } } };
export const Empty: Story = {
  args: { state: { status: 'ready', publishedAt: PUBLISHED_AT, subjects: [] } },
};
export const ErrorState: Story = {
  args: {
    state: {
      status: 'error',
      message: 'The waiting list could not be read. Check your connection and try again.',
      onRetry: () => undefined,
    },
  },
};
export const LongContent: Story = {
  args: {
    state: {
      status: 'ready',
      publishedAt: PUBLISHED_AT,
      subjects: Array.from({ length: 12 }, (_, i) =>
        subject(
          `r${i}`,
          'route',
          `Fairview Terminal – Quezon Memorial Circle via Commonwealth Avenue and Tandang Sora ${i + 1}`,
          i % 3 === 0 ? 'taken_down' : 'approved',
        ),
      ),
    },
  },
};
