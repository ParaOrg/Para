import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { SubjectStatusView } from './subject-status-view';
import type { PublicationSubject } from '../data/publication';
import { reviewMessage } from '../data/review-commands';

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
const MATCHES = [
  subject({}),
  subject({ id: 'r2', label: 'Tala – Novaliches via Zabarte', status: 'taken_down' }),
  subject({ id: 'h1', kind: 'hotspot', label: 'Tala Terminal' }),
];

const meta = {
  title: 'Features/Studio/SubjectStatusView',
  component: SubjectStatusView,
  // Under the studio search's results, 296 across inside its 12 each side.
  decorators: [
    (Story) => (
      <div className="w-80 bg-surface-quaternary p-3 font-sn-pro">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  args: {
    state: 'ready',
    matches: MATCHES,
    notice: null,
    isBusy: false,
    onPress: fn(),
    onRetry: fn(),
  },
} satisfies Meta<typeof SubjectStatusView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Published ones offer Take down, the taken-down route Put back. */
export const Matches: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('listitem')).toHaveLength(3);
    await expect(canvas.getByText('Route · Taken down')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Put back' }));
    await expect(args.onPress).toHaveBeenCalledWith(MATCHES[1]);
  },
};

/** A long name keeps one line, cut short, beside its button. */
export const LongName: Story = {
  args: {
    matches: [
      subject({
        label:
          'Velasco Ave. Loading/Unloading Bay – Lakandula Extn. cor. Jacinto St. (CFA Waiting Shed)',
      }),
    ],
  },
};

/** Taken down: what it did, said above the list, which now offers Put back. */
export const TakenDown: Story = {
  args: {
    matches: [subject({ status: 'taken_down' })],
    notice: reviewMessage({ code: 'taken_down' }),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent(
      reviewMessage({ code: 'taken_down' }),
    );
  },
};

/** Refused: a route still ends at the place. */
export const Blocked: Story = {
  args: {
    matches: [subject({ kind: 'hotspot', label: 'Tala Terminal' })],
    notice: 'A route still ends here. Change or take down that route first.',
  },
};

/** The change did not reach the database: plain words, never the raw error. */
export const NotSent: Story = {
  args: { notice: 'Couldn’t change it. Check your connection and try again.' },
};

/** A change under way: no button can start a second. */
export const Busy: Story = {
  args: { isBusy: true },
  play: async ({ canvasElement }) => {
    for (const button of within(canvasElement).getAllByRole('button'))
      await expect(button).toBeDisabled();
  },
};

/** The search cleared after a change: the notice stays until the next one. */
export const NoticeAfterClearing: Story = {
  args: { state: 'idle', matches: [], notice: reviewMessage({ code: 'put_back' }) },
};

/** Too little typed: nothing shows but the status region, empty. */
export const Idle: Story = {
  args: { state: 'idle', matches: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('list')).toBeNull();
  },
};

/** Reading the routes and places. */
export const Reading: Story = { args: { state: 'reading', matches: [] } };

/** The read failed: why, and Try again. */
export const ReadFailed: Story = {
  args: { state: 'failed', matches: [] },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Try again' }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};
