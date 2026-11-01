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
type Story = StoryObj<typeof meta>;

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

/** With a small action on the right, before ✕. */
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
  },
};

/** Long words: the title stays on one line, cut; the line under it wraps; ✕ stays in place. */
export const LongText: Story = {
  args: {
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
