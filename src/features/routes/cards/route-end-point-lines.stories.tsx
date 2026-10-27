import type { Meta, StoryObj } from '@storybook/react-vite';

import { CARD_SURFACE, CARD_TEXT } from './livery-card';
import { RouteEndPointLines } from './route-end-point-lines';

/** Figma's Lines (4235:12313): the tree line before a RouteCard's row, white, drawn here on orange at a row's 40. */
const meta = {
  title: 'Features/Routes/RouteEndPointLines',
  component: RouteEndPointLines,
  args: { position: 'top' },
  decorators: [
    (Story) => (
      <div className="flex h-10 w-12 bg-card-orange-surface text-content-inverse">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RouteEndPointLines>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Property 1=Top: the line runs through the row and on below it. */
export const Top: Story = {};

/** Property 1=Bottom: the line ends at its arrow. */
export const Bottom: Story = { args: { position: 'bottom' } };

/** On MRT-3's yellow the lines take the card's dark words. */
export const OnDarkWords: Story = {
  decorators: [
    (Story) => (
      <div
        className={
          'flex h-10 w-12 ' +
          CARD_SURFACE['metro-rail-way-three'] +
          ' ' +
          CARD_TEXT['metro-rail-way-three']
        }
      >
        <Story />
      </div>
    ),
  ],
};
