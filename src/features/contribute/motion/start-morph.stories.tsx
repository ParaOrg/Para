import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { cssDurationMs } from '@/shared/utils/css-duration';

import { START_MORPH_ATTR, morphStartIntoCard } from './start-morph';
import { RECORDING_CARD_ATTR, START_BUTTON_ATTR } from '../common/data-attributes';
import { RecordingCard } from '../screens/recording-card';
import { StartBar } from '../screens/start-bar';
import { TrackingButton } from '../screens/tracking-button';

/** Start tracking, and once tapped the recording card in its place, as the page swaps them. */
function MorphDemo() {
  const [isRecording, setIsRecording] = useState(false);
  const handleStart = () => {
    const button = document.querySelector<HTMLElement>(`[${START_BUTTON_ATTR}]`);
    setIsRecording(true);
    if (button) morphStartIntoCard(button);
  };
  return (
    <div className="relative flex h-[852px] w-[393px] flex-col justify-end bg-surface-quaternary pb-8">
      {isRecording ? (
        <div {...{ [RECORDING_CARD_ATTR]: true }} className="px-5 pb-1.5">
          <RecordingCard elapsedSeconds={0} distanceM={0} state="lakad">
            <TrackingButton variant="pause" corner="bottom-left" onClick={() => undefined} />
            <TrackingButton variant="sakay" corner="bottom-right" onClick={() => undefined} />
          </RecordingCard>
        </div>
      ) : (
        <StartBar onClick={handleStart} />
      )}
    </div>
  );
}

const meta = {
  title: 'Features/Contribute/StartMorph',
  component: MorphDemo,
} satisfies Meta<typeof MorphDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

const token = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** An easing as WAAPI writes it back: a built stylesheet's ".55" is "0.55". */
const easingOf = (text: string) => text.replace(/(^|[\s(,])\.(\d)/g, '$10.$2');

/**
 * Start tracking folding into a pill at its right (duration-quick, ease-exit), then opening into
 * the recording card in its place (duration-gentle, ease-move). Press Start tracking to see it.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Start tracking' }));
    const ghost = document.querySelector(`[${START_MORPH_ATTR}]`);
    await expect(ghost).not.toBeNull();
    const [fold] = ghost?.getAnimations() ?? [];
    // In milliseconds, as WAAPI takes it, whether the CSS says 150ms or a build's .15s.
    await expect(fold?.effect?.getTiming().duration).toBe(
      cssDurationMs(token('--transition-duration-quick')),
    );
    await expect(fold?.effect?.getTiming().easing).toBe(easingOf(token('--ease-exit')));
    await waitFor(() => expect(document.querySelector(`[${START_MORPH_ATTR}]`)).toBeNull(), {
      timeout: 2000,
    });
    await expect(canvas.getByRole('group', { name: 'Recording so far' })).toBeVisible();
  },
};
