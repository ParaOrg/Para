import type { Meta, StoryObj } from '@storybook/react-vite';

import { VehicleGrid } from './vehicle-grid';

const meta = {
  title: 'Features/Contribute/VehicleGrid',
  component: VehicleGrid,
  args: {
    rides: { jeep: 5, eJeep: 2, uvExpress: 0, bus: 12, train: 2, ferry: 0 },
  },
  decorators: [
    (Story) => (
      <div className="w-[393px] bg-surface px-5 py-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VehicleGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As the frame has it (4514:23003): `--` for none. */
export const Default: Story = {};

/** No rides yet: every cell `--`. */
export const NoRides: Story = {
  args: { rides: { jeep: 0, eJeep: 0, uvExpress: 0, bus: 0, train: 0, ferry: 0 } },
};

/** Long counts, with thousands separators, still three across. */
export const LongCounts: Story = {
  args: { rides: { jeep: 1_204, eJeep: 310, uvExpress: 88, bus: 14_020, train: 912, ferry: 14 } },
};
