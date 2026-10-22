import type { Meta, StoryObj } from '@storybook/react-vite';

import { TIMELINE_SURFACE } from './livery-card';
import { TimelineDot } from './timeline-dot';

/**
 * Figma's TimelineDot, in orange (3716:1894; Figma draws the set in red):
 * at rest, Selected, and untucked as the map's hintuans and ride ends wear
 * it (HintuanLabel, EndTitles), on the orange card.
 */
const meta = {
  title: 'Features/Routes/TimelineDot',
  component: TimelineDot,
  args: { rail: TIMELINE_SURFACE.orange },
  decorators: [
    (Story) => (
      <div className="flex w-12 justify-center bg-card-orange-surface py-3">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TimelineDot>;

export default meta;
type Story = StoryObj<typeof meta>;

/** At rest: a white centre in a thick ring of the rail's colour. */
export const Rest: Story = {};

/** Selected (State=Selected): the ring thins round a white disc, the rail's colour at its centre. */
export const Selected: Story = { args: { selected: true } };

/** Untucked, as the map draws it: no rail after it, so its box is its own 24. */
export const Untucked: Story = { args: { isTucked: false } };

/** Selected and untucked: a picked hintuan on the map (HintuanLabel). */
export const SelectedUntucked: Story = { args: { selected: true, isTucked: false } };
