import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { KeepRecordingPanel } from './keep-recording-panel';

const meta = {
  title: 'Features/Contribute/KeepRecordingPanel',
  component: KeepRecordingPanel,
  args: { onOpenSettings: fn(), onDone: fn() },
  decorators: [
    (Story) => (
      <div className="w-[390px] bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KeepRecordingPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Shown once, at the first Start on a Xiaomi, Redmi, POCO, Oppo, realme, Vivo, Huawei, Honor,
 * OnePlus or Samsung phone. Open settings goes to the maker's Autostart screen; Done starts.
 */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Keep Para recording' })).toHaveFocus();
    await userEvent.click(canvas.getByRole('button', { name: 'Open settings' }));
    await expect(args.onOpenSettings).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: 'Done' }));
    await expect(args.onDone).toHaveBeenCalledOnce();
  },
};
