import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { HintuanCardBox } from './hintuan-card-box';
import type { Hotspot } from '../model/hotspots';

/** Sample data only, shaped like a saved row: SM Fairview's terminal and its hintuan. */
const box = (id: string, name: string, kind: Hotspot['kind']): Hotspot => ({
  id,
  name,
  informal: 'SM Fairview',
  aliases: [],
  kind,
  point: { type: 'Point', coordinates: [121.062, 14.735] },
  area: {
    type: 'Polygon',
    coordinates: [
      [
        [121.061, 14.734],
        [121.063, 14.734],
        [121.063, 14.736],
        [121.061, 14.736],
      ],
    ],
  },
  note: null,
  createdAt: '2026-09-12T00:00:00Z',
});

/** Figma's HotspotSelectionBar: a hintuan's and a terminal's box, at rest and Selected. */
const meta = {
  title: 'Features/Routes/HintuanCardBox',
  component: HintuanCardBox,
  args: {
    box: box('h1', 'SM Fairview Main', 'hintuan'),
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
  args: { box: box('t1', 'SM Fairview Terminal', 'terminal'), name: 'SM Fairview Terminal' },
};

/** The last row, with the route counter across its foot. */
export const WithCounter: Story = { args: { hasCounter: true } };

/** A name too long for the row: cut short. */
export const LongName: Story = {
  args: { name: 'SM City Fairview Main Entrance Opposite the Jeepney Terminal and Parking' },
};
