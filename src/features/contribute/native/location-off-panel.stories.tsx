import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { LocationOffPanel } from './location-off-panel';

const meta = {
  title: 'Features/Contribute/LocationOffPanel',
  component: LocationOffPanel,
  args: { onOpenSettings: fn(), onClose: fn() },
  decorators: [
    (Story) => (
      <div className="w-[390px] bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LocationOffPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Start tapped with the phone's location off: no ride starts, and this says where to turn it on. */
export const LocationOff: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // Its heading takes the focus as it shows, for a screen reader to say why Start did nothing.
    await waitFor(() =>
      expect(canvas.getByRole('heading', { name: 'Turn on location' })).toHaveFocus(),
    );
    await expect(canvas.getByText('Para needs your location to record your ride.')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Go to Settings' }));
    await expect(args.onOpenSettings).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};
