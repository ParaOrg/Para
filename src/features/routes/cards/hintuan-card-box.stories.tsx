import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { HintuanCardBox } from './hintuan-card-box';
import type { Hotspot } from '../model/hotspots';

/** Sample data only: the two fields the row reads. */
const box = (id: string, kind: Hotspot['kind']): Pick<Hotspot, 'id' | 'kind'> => ({ id, kind });

/** Figma's HotspotSelectionBar: a hintuan's and a terminal's box, at rest and Selected. */
const meta = {
  title: 'Features/Routes/HintuanCardBox',
  component: HintuanCardBox,
  args: {
    box: box('h1', 'hintuan'),
    name: 'SM Fairview Main',
    isSelected: false,
    hasCounter: false,
    onToggle: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HintuanCardBox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A hintuan's box at rest. */
export const Hintuan: Story = {};

/** The Selected row: pressed in. */
export const HintuanSelected: Story = { args: { isSelected: true } };

/** A terminal's box, in sky. */
export const Terminal: Story = {
  args: { box: box('t1', 'terminal'), name: 'SM Fairview Terminal' },
};

/** The last row, with the route counter across its foot. */
export const WithCounter: Story = { args: { hasCounter: true } };

/** A name too long for the row: cut short. */
export const LongName: Story = {
  args: { name: 'SM City Fairview Main Entrance Opposite the Jeepney Terminal and Parking' },
};
