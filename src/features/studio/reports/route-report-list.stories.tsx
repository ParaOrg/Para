import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { RouteReportList, type RouteReportRow } from './route-report-list';

const meta = {
  title: 'Features/Studio/RouteReportList',
  component: RouteReportList,
  decorators: [
    (Story) => (
      <div className="w-96 bg-surface p-4 font-sn-pro text-sm text-content-primary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RouteReportList>;
export default meta;
type Story = StoryObj<typeof meta>;

const NOW = Date.UTC(2026, 10, 11, 6, 0, 0);
const HOUR = 3_600_000;
const REPORTS: RouteReportRow[] = [
  {
    id: 'r1',
    routeLabel: 'Cubao – Quiapo',
    wayLabel: 'to Quiapo',
    kind: 'wrong_signboard',
    note: 'The board now says Lawton, not Quiapo.',
    createdAt: NOW - 2 * HOUR,
  },
  {
    id: 'r2',
    routeLabel: 'SM Fairview – Philcoa',
    wayLabel: null,
    kind: 'no_longer_runs',
    note: null,
    createdAt: NOW - 30 * HOUR,
  },
  {
    id: 'r3',
    routeLabel: 'Montalban – Cubao via Marcos Highway and Aurora Boulevard',
    wayLabel: 'to Cubao',
    kind: 'other',
    note: 'Jeeps stop running at 9 in the evening now, and the last trip leaves the terminal early when it is full. '.repeat(
      4,
    ),
    createdAt: NOW - 5 * 24 * HOUR,
  },
];
const ready = (overrides = {}) => ({
  state: {
    status: 'ready' as const,
    reports: REPORTS,
    now: NOW,
    busyId: null,
    notice: null,
    onResolve: fn(),
    ...overrides,
  },
});

export const Open: Story = { args: ready() };

/** Done sends that report's id; Dismiss likewise. */
export const DoneAndDismiss: Story = {
  args: ready(),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const first = canvas.getByRole('group', { name: 'Cubao – Quiapo: Wrong signboard' });
    await userEvent.click(within(first).getByRole('button', { name: 'Done' }));
    const second = canvas.getByRole('group', { name: 'SM Fairview – Philcoa: No longer runs' });
    await userEvent.click(within(second).getByRole('button', { name: 'Dismiss' }));
    if (args.state.status !== 'ready') throw new Error('the story is ready');
    await expect(args.state.onResolve).toHaveBeenNthCalledWith(1, 'r1', 'done');
    await expect(args.state.onResolve).toHaveBeenNthCalledWith(2, 'r2', 'dismissed');
  },
};

/** One is under way: every Done and Dismiss waits. */
export const Busy: Story = {
  args: ready({ busyId: 'r1' }),
  play: async ({ canvasElement }) => {
    for (const button of within(canvasElement).getAllByRole('button')) {
      await expect(button).toBeDisabled();
    }
  },
};

export const AfterDone: Story = {
  args: ready({ reports: REPORTS.slice(1), notice: 'Marked done: Cubao – Quiapo.' }),
};

export const Empty: Story = {
  args: ready({ reports: [] }),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('No open reports.')).toBeVisible();
  },
};

export const Loading: Story = { args: { state: { status: 'loading' } } };

export const Failed: Story = {
  args: {
    state: {
      status: 'error',
      message: 'The reports could not be read. Check your connection and try again.',
      onRetry: fn(),
    },
  },
};

/** Before the reports migration is applied, the table is not there. */
export const NotSetUp: Story = {
  args: {
    state: {
      status: 'error',
      message: 'Reports aren’t set up yet. They appear here once they are.',
      onRetry: fn(),
    },
  },
};
