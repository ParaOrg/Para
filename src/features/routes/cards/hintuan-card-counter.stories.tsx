import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { HintuanCardCounter } from './hintuan-card-counter';

/** Figma's HintuanCardRouteCounter (3851:12206): the count of routes and SWITCH. */
const meta = {
  title: 'Features/Routes/HintuanCardCounter',
  component: HintuanCardCounter,
  args: {
    count: '2 routes pass here',
    word: 'Pabalik',
    isBack: false,
    canSwitch: true,
    onFlip: fn(),
  },
  decorators: [
    (Story) => (
      <div className="relative h-24 w-96 bg-neutral-100 pt-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HintuanCardCounter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The way there showing: SWITCH names where a tap leads. */
export const Default: Story = {};

/** One route: the verb agrees with the count. */
export const OneRoute: Story = { args: { count: '1 route passes here' } };

/** No box is passed the other way: SWITCH rests disabled. */
export const NothingTheOtherWay: Story = { args: { canSwitch: false } };

/** The way back showing. */
export const TheWayBack: Story = { args: { isBack: true, word: 'Papunta' } };

/** Only loops pass here: they have no way back, so no SWITCH at all. */
export const OnlyLoops: Story = {
  args: { count: '1 route passes here', word: null, canSwitch: false },
};
