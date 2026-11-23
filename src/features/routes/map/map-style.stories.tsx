import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ReactNode } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { BASEMAPS, type Basemap } from './basemap';
import { BASEMAP_THUMBNAILS } from './basemap-thumbnails';
import { MapStyle } from './map-style';
import { MapStyleRowsContext } from './map-style-rows';
import { MapStyleSwitchRow } from './map-style-switch-row';

const meta = {
  title: 'Features/Routes/MapStyle',
  component: MapStyle,
  // Over a map-coloured box, as it floats over the map.
  decorators: [
    (Story) => (
      <div className="inline-block bg-surface-quaternary p-6">
        <Story />
      </div>
    ),
  ],
  args: {
    basemaps: BASEMAPS,
    selectedId: 'positron',
    thumbnails: BASEMAP_THUMBNAILS,
    onSelect: fn(),
    areLabelsShown: false,
    onLabelsToggle: fn(),
    onClose: fn(),
    onClosed: fn(),
  },
} satisfies Meta<typeof MapStyle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The public map's three, Monochrome shown, Location Labels off: Figma 4179:10790. */
export const Default: Story = {};

/** Location Labels on: the basemap's own labels shown. */
export const LabelsShown: Story = { args: { areLabelsShown: true } };

/** Colour shown. */
export const ColourSelected: Story = { args: { selectedId: 'liberty' } };

/** Fiord shown. */
export const FiordSelected: Story = { args: { selectedId: 'fiord' } };

// The studio's two, as the stories may not reach into features/studio:
// pictureless, which is the tile a design without a picture shows.
const STUDIO_LIKE: readonly Basemap[] = [
  ...BASEMAPS,
  { ...BASEMAPS[1], id: 'terrain', label: 'Terrain' },
  { ...BASEMAPS[0], id: 'satellite', label: 'Satellite' },
];

/** The studio's five, three a row; here Terrain and Satellite without pictures. */
export const FiveWrap: Story = { args: { basemaps: STUDIO_LIKE, selectedId: 'terrain' } };

/** No picture for any design: plain tiles, the names still read. */
export const NoPictures: Story = { args: { thumbnails: {} } };

/** On a phone, 390 wide: the card fits with the map's 16 px each side to spare. */
export const Phone: Story = {
  decorators: [
    (Story) => (
      <div className="@container w-[390px] bg-surface-quaternary px-4 py-6">
        <Story />
      </div>
    ),
  ],
};

/** The studio's Footbridges switch (.scratch/footbridges, ticket 03), as its page adds it. */
function WithFootbridgesRow({ children }: { children: ReactNode }) {
  const [isOn, setIsOn] = useState(false);
  return (
    <MapStyleRowsContext
      value={
        <MapStyleSwitchRow label="Footbridges" isOn={isOn} onToggle={() => setIsOn((on) => !on)} />
      }
    >
      {children}
    </MapStyleRowsContext>
  );
}

/**
 * In the studio: a page's own row under Location Labels, here Footbridges, off at first; a tap on
 * its words turns it on. The public map adds none (Default).
 */
export const StudioFootbridges: Story = {
  args: { basemaps: STUDIO_LIKE, selectedId: 'terrain' },
  decorators: [
    (Story) => (
      <WithFootbridgesRow>
        <Story />
      </WithFootbridgesRow>
    ),
  ],
  play: async ({ canvasElement }) => {
    const card = within(canvasElement);
    const footbridges = card.getByRole('switch', { name: 'Footbridges' });
    await expect(footbridges).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(card.getByText('Footbridges'));
    await expect(footbridges).toHaveAttribute('aria-checked', 'true');
    // Under Location Labels, as the card's own rows come first.
    const labels = card.getByRole('switch', { name: 'Location Labels' });
    await expect(
      labels.compareDocumentPosition(footbridges) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  },
};
