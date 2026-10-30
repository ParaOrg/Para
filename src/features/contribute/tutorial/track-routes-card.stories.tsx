import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { TrackRoutesCard } from './track-routes-card';

const meta = {
  title: 'Features/Contribute/TrackRoutesCard',
  component: TrackRoutesCard,
  args: { onTutorial: fn(), onLater: fn() },
} satisfies Meta<typeof TrackRoutesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The card alone, at phone width less the 16px either side it sits in (361px). */
export const Default: Story = {
  decorators: [
    (Story) => (
      <div className="w-[361px]">
        <Story />
      </div>
    ),
  ],
};

/** A phone specimen: the card at the foot of the map's space, as frame 4451:514 places it. */
export const PhoneSpecimen: Story = {
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="@container flex h-[852px] w-[393px] flex-col justify-end bg-surface-quaternary p-4 pb-24">
        <Story />
      </div>
    ),
  ],
};
