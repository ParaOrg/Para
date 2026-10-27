import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { BatteryPanel } from './battery-panel';
import { batteryHelpFor } from './battery-steps';

const xiaomi = batteryHelpFor('xiaomi');
if (!xiaomi) throw new Error('The battery steps have no entry for Xiaomi.');

const meta = {
  title: 'Features/Contribute/BatteryPanel',
  component: BatteryPanel,
  args: { help: xiaomi, onOpenSettings: fn(), onDone: fn() },
  decorators: [
    (Story) => (
      <div className="w-[390px] bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BatteryPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shown once, the first time a Xiaomi, Oppo, Vivo, Samsung, Huawei or Realme phone starts. */
export const Xiaomi: Story = {};

/** The longest steps. */
export const Huawei: Story = {
  args: { help: batteryHelpFor('huawei') ?? xiaomi },
};
