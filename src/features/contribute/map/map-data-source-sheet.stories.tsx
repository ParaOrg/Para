import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { mapCredits } from '@/features/routes/map/map-attribution';
import { OPENFREEMAP_HOST } from '@/shared/config/basemap-host';

import { MapDataSourceSheet } from './map-data-source-sheet';

const meta = {
  title: 'Features/Contribute/MapDataSourceSheet',
  component: MapDataSourceSheet,
  args: { credits: mapCredits('https://tiles.para-commute.org'), onClose: fn() },
  // A phone over a map-coloured box: the scrim dims it, the sheet stands at its foot.
  decorators: [
    (Story) => (
      <div className="relative h-[852px] w-[393px] overflow-hidden bg-surface-quaternary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MapDataSourceSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Para's own tiles: OpenMapTiles credited for the schema and styles (Figma 4494:10177), over the scrim. */
export const Default: Story = {};

/** A build on OpenFreeMap's tiles: its row names OpenFreeMap, with the same description. */
export const OpenFreeMap: Story = { args: { credits: mapCredits(OPENFREEMAP_HOST) } };

/** A long title and description wrap inside the row, the chevron kept at its side. */
export const LongContent: Story = {
  args: {
    credits: [
      {
        title: '© A credit whose name runs much longer than any the map has today',
        description: 'And a description long enough to wrap onto a second line on a phone',
        href: 'https://example.org',
        isCredit: true,
      },
      ...mapCredits(OPENFREEMAP_HOST),
    ],
  },
};
