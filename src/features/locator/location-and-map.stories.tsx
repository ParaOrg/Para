import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { MapStyleButton } from '@/features/routes/map/map-style-button';

import { LocationAndMap } from './location-and-map';
import { LocatorButton, type LocatorMode } from './locator-button';

interface PillProps {
  mode: LocatorMode;
}

/** The pill as the Locator fills it: the map-style button over the LocatorButton. */
function Pill({ mode }: PillProps) {
  return (
    <LocationAndMap>
      <MapStyleButton corners="top" currentLabel="Monochrome" onClick={fn()} />
      <LocatorButton corners="bottom" mode={mode} onClick={fn()} aria-label="Show where I am" />
    </LocationAndMap>
  );
}

const meta = {
  title: 'Features/Locator/LocationAndMap',
  component: Pill,
  decorators: [
    (Story) => (
      <div className="grid min-h-40 min-w-40 place-items-center bg-neutral-200 p-6">
        <Story />
      </div>
    ),
  ],
  args: { mode: 'TracksTheMapBasedOnCompassFacing' },
} satisfies Meta<typeof Pill>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As Figma draws it (4245:1966): the camera turned with the phone. */
export const TracksTheMapBasedOnCompassFacing: Story = {};

/** No location yet. */
export const LocationOff: Story = { args: { mode: 'LocationOff' } };

/** The camera elsewhere. */
export const TrackOwnLocation: Story = { args: { mode: 'TrackOwnLocation' } };

/** The camera on the commuter, north up. */
export const TrackedLocation: Story = { args: { mode: 'TrackedLocation' } };

/** On a phone, past nothing but its own 48 × 96. */
export const Phone: Story = {
  decorators: [
    (Story) => (
      <div className="@container relative h-[852px] w-[393px] bg-neutral-200">
        <div className="absolute right-3 bottom-[420px]">
          <Story />
        </div>
      </div>
    ),
  ],
};
