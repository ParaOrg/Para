import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { AlertCircleIcon } from '@/design-system/primitives/field-icons';

import { InformationIcon } from './route-icons';
import { Toast } from './toast';

const meta = {
  title: 'Shared/UI/Toast',
  component: Toast,
  // A phone's width, the toast 12 in from each side, over a quiet ground as the map would be.
  decorators: [
    (Story) => (
      <div className="w-97.5 bg-surface-secondary px-3 py-6">
        <Story />
      </div>
    ),
  ],
  args: {
    kind: 'info',
    icon: <InformationIcon />,
    title: 'Saved on this phone',
    onClose: fn(),
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof Toast>;

/** Info: an icon and a title; it goes by itself in a host. ✕ closes it sooner. */
export const Info: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Close' }));
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};

/** Info with a line under the title, in Content/secondary. */
export const InfoWithBody: Story = {
  args: { body: 'It goes up when you have signal.' },
};

/** A problem: the icon in Content/error, the card as any other. It stays until it is closed. */
export const Problem: Story = {
  args: {
    kind: 'problem',
    icon: <AlertCircleIcon />,
    title: 'Couldn’t upload',
    body: 'No signal. We’ll try again when you’re back online.',
  },
};

/** A problem with a small action on the right, before ✕: it does its thing, then closes the toast. */
export const WithAction: Story = {
  args: {
    kind: 'problem',
    icon: <AlertCircleIcon />,
    title: 'Location is off',
    body: 'Turn it on to record.',
    action: { label: 'Settings', onAction: fn() },
  },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Settings' }));
    await expect(args.action?.onAction).toHaveBeenCalledOnce();
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};

/** Long words, on a problem with an action: the title stays on one line, cut; the line under it wraps; ✕ stays put. */
export const LongText: Story = {
  args: {
    kind: 'problem',
    icon: <AlertCircleIcon />,
    title: 'Your recording from Fairview Teraccess Transport Terminal was saved on this phone',
    body:
      'It goes up to Para by itself the next time this phone has signal, so you can keep riding ' +
      'and close the app.',
    action: { label: 'History', onAction: fn() },
  },
};

/**
 * Gone: slid up and faded, as a toast leaves. It tells its host once the slide has finished (at
 * once here and with reduced motion, where there is none), and the host takes it away.
 */
export const Leaving: Story = {
  args: { isLeaving: true, onLeft: fn() },
  play: async ({ args }) => {
    await waitFor(() => expect(args.onLeft).toHaveBeenCalledOnce());
  },
};

/**
 * Compact: a pill that hugs its icon and one-line title, centred, with no ✕. Info alone, and only
 * with a title: it goes by itself in a host.
 */
export const Compact: Story = {
  args: { size: 'compact', title: 'Route reversed' },
  play: async ({ canvasElement }) => {
    const toast = within(canvasElement).getByTestId('toast');
    await waitFor(() => expect(toast).toBeVisible());
    await expect(within(toast).queryByRole('button')).toBeNull();
    // It hugs its words, centred in the width it has.
    const box = toast.getBoundingClientRect();
    const room = toast.parentElement?.getBoundingClientRect();
    await expect(box.width).toBeLessThan((room?.width ?? 0) - 40);
    await expect(
      Math.abs(box.left + box.width / 2 - ((room?.left ?? 0) + (room?.width ?? 0) / 2)),
    ).toBeLessThan(1);
  },
};

/** Compact with a title too long for the screen: the pill takes the width it has and cuts the title. */
export const CompactLongTitle: Story = {
  args: {
    size: 'compact',
    title:
      'Fairview Teraccess Transport Terminal is now the end of this route, the other way round',
  },
  play: async ({ canvasElement }) => {
    const toast = within(canvasElement).getByTestId('toast');
    const title = within(toast).getByText(/^Fairview/);
    await waitFor(() => expect(toast).toBeVisible());
    await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
    await expect(title.getBoundingClientRect().height).toBeLessThan(30);
  },
};
