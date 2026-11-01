import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Notices } from './notices';

const meta = {
  title: 'Features/PublishedMap/Notices',
  component: Notices,
  // They sit over the map, so give them a map-sized box to sit in. `@container`
  // is what their `@wide:` classes measure: from 640 wide the age moves to the
  // top; the `phone` parameter shrinks the box to a handset so it shows along
  // the bottom.
  decorators: [
    (Story, ctx) => (
      <div
        className={
          ctx.parameters.phone
            ? '@container relative h-[700px] w-[390px] overflow-clip bg-surface-quaternary'
            : '@container relative h-[28rem] overflow-clip bg-surface-quaternary'
        }
      >
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    offline: false,
    age: { publishedAt: '2026-10-11T09:00:00Z', stale: false },
    needRefresh: false,
    onUpdate: fn(),
  },
} satisfies Meta<typeof Notices>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A fresh map, loaded, and no new version: nothing to say, so nothing shows. */
export const Nothing: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('button, [data-testid]')).toBeNull();
  },
};

/** No signal: the map is what the phone kept, dated from inside the file. */
export const Offline: Story = {
  args: { offline: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('offline')).toHaveTextContent(
      'Offline · map as of 11 Oct',
    );
  },
};

/** Online, but the network was too slow to answer in time. */
export const NotRefreshed: Story = {
  args: { age: { publishedAt: '2026-10-11T09:00:00Z', stale: true } },
};

/** Offline with a map whose file carries no date: the pill says only that. */
export const OfflineUndated: Story = {
  args: { offline: true, age: { publishedAt: null, stale: false } },
};

/** On a phone the age sits bottom left, above the scale. */
export const OfflinePhone: Story = { args: { offline: true }, parameters: { phone: true } };

/** A new version waiting: it never applies itself, the commuter taps it. */
export const UpdateWaiting: Story = {
  args: { needRefresh: true },
  play: async ({ args, canvasElement }) => {
    const update = within(canvasElement).getByTestId('update');
    await userEvent.click(update);
    update.blur();
    await expect(args.onUpdate).toHaveBeenCalledOnce();
  },
};

/** Everything at once on a phone: offline, with an update waiting. */
export const AllAtOncePhone: Story = {
  args: { offline: true, needRefresh: true },
  parameters: { phone: true },
};
