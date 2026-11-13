import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { FlagStopButton, type FlagStopButtonProps } from './flag-stop-button';
import { PageToasts } from '../notices/page-toasts';

const meta = {
  title: 'Features/Contribute/FlagStopButton',
  component: FlagStopButton,
  decorators: [
    (Story) => (
      <div className="grid min-h-40 min-w-56 place-items-center bg-neutral-200 p-6">
        <Story />
      </div>
    ),
  ],
  args: { isRecording: true, canFlag: true, onFlag: fn() },
} satisfies Meta<typeof FlagStopButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Recording, on Lakad or Sakay: a tap flags the place, and the page says "Stop flagged". */
export const Default: Story = {};

/** Paused: shown, disabled, as the Paused frame draws it. */
export const Paused: Story = { args: { isRecording: false } };

/** The ride holds the most stops it can: it looks as Paused, keeps focus, and a tap does nothing. */
export const AtTheLimit: Story = { args: { canFlag: false } };

/** The button as the page has it: each flag says "Stop flagged" in a toast at the top. */
function WithPageToasts(props: FlagStopButtonProps) {
  const [stopsFlagged, setStopsFlagged] = useState(0);
  const handleFlag = () => {
    props.onFlag();
    setStopsFlagged((flagged) => flagged + 1);
  };
  return (
    <>
      <PageToasts
        problem={null}
        isScreenFreeToSleep={false}
        mapNote={null}
        stopsFlagged={stopsFlagged}
        onAddNote={() => undefined}
        canAddNote
        routeRecorded={null}
        uploadProblem={null}
      />
      <FlagStopButton {...props} onFlag={handleFlag} />
    </>
  );
}

/** Tapped twice: one "Stop flagged" toast, said again in place, which leaves by itself. */
export const JustFlagged: Story = {
  decorators: [
    (Story) => (
      // A phone's screen: the toast floats at its top (transform-gpu holds the fixed toast inside).
      <div className="h-150 w-97.5 transform-gpu">
        <Story />
      </div>
    ),
  ],
  render: (args) => <WithPageToasts {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Flag a stop' });
    await userEvent.click(button);
    await expect(await canvas.findByTestId('toast')).toHaveTextContent('Stop flagged');
    await userEvent.click(button);
    await expect(args.onFlag).toHaveBeenCalledTimes(2);
    await expect(canvas.getAllByTestId('toast')).toHaveLength(1);
    await waitFor(() => expect(canvas.queryByTestId('toast')).toBeNull(), { timeout: 6000 });
  },
};
