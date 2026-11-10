import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { KeepRecordingPanel } from './keep-recording-panel';

const meta = {
  title: 'Features/Contribute/KeepRecordingPanel',
  component: KeepRecordingPanel,
  args: { brand: 'xiaomi', onOpenSettings: fn(), onDone: fn() },
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
 * Shown once, at the first Start on a phone whose maker stops background apps
 * (keep-recording-makers.ts), in that maker's steps: here the owner's POCO. Open settings goes to
 * the maker's Autostart screen; Done starts.
 */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Keep Para recording' })).toHaveFocus();
    await expect(canvas.getAllByRole('listitem')).toHaveLength(2);
    await expect(canvas.getByText('Turn on Autostart for Para.')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Open settings' }));
    await expect(args.onOpenSettings).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: 'Done' }));
    await expect(args.onDone).toHaveBeenCalledOnce();
  },
};

/** OPPO, realme and OnePlus: Auto launch, then Allow background activity. */
export const Oppo: Story = { args: { brand: 'oppo' } };

/** vivo and iQOO. */
export const Vivo: Story = { args: { brand: 'vivo' } };

/** Infinix and Tecno: Phone Master's Auto-start. */
export const InfinixAndTecno: Story = { args: { brand: 'transsion' } };

/** Samsung: Unrestricted, and out of Sleeping apps. */
export const Samsung: Story = { args: { brand: 'samsung' } };

/** Huawei and Honor: App launch. */
export const Huawei: Story = { args: { brand: 'huawei' } };

/** No group's steps (not shown at Start today): the words every phone takes. */
export const AnyPhone: Story = {
  args: { brand: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('list')).toBeNull();
    await expect(canvas.getByText(/Turn on Autostart and set Battery saver/)).toBeVisible();
  },
};
