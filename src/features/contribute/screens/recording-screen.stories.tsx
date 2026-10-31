import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { RecordingScreen } from './recording-screen';

const meta = {
  title: 'Features/Contribute/RecordingScreen',
  component: RecordingScreen,
  args: {
    figures: { elapsedSeconds: 42, distanceM: 421 },
    mode: 'walk',
    isPaused: false,
    isAwake: true,
    shouldFocusPause: false,
    onPause: fn(),
    onResume: fn(),
    onModeSwitch: fn(),
    onFinish: fn(),
    onAskToStop: fn(),
    discardButtonRef: { current: null },
    isCardFolded: false,
    onCardFoldedChange: fn(),
    onOpenCredits: fn(),
    creditsButtonRef: { current: null },
  },
  // A phone over a map-coloured box. The right-hand column is the page's locator, not drawn here.
  decorators: [
    (Story) => (
      <div className="relative h-[852px] w-[393px] overflow-hidden bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RecordingScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Recording on Lakad, the card out (Figma 4494:2038). */
export const Lakad: Story = {};

/** Paused: Resume and Finish, the edges in neutral/900 (4494:2134). */
export const Paused: Story = { args: { isPaused: true } };

/** Recording on Sakay (4494:2233). */
export const Sakay: Story = { args: { mode: 'ride' } };

/** The card folded away: the chevron, turned up, at the foot brings it back (4496:10906). */
export const Folded: Story = { args: { isCardFolded: true } };

/** The screen could not be kept awake: the note stands over the card. */
export const NotKeptAwake: Story = { args: { isAwake: false } };

/** Folded, with the note that the screen may sleep: it stays in the stack, under the column. */
export const FoldedNotKeptAwake: Story = { args: { isCardFolded: true, isAwake: false } };
