import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import type { MapNoteGiven } from './map-note';
import { PageToasts } from './page-toasts';
import {
  LOCATION_BLOCKED_PROBLEM,
  LOCATION_OFF_PROBLEM,
  OTHER_TAB_PROBLEM,
  POSITION_TIMEOUT_PROBLEM,
  POSITION_UNAVAILABLE_PROBLEM,
  STORAGE_PROBLEM,
} from './recorder-problems';

const meta = {
  title: 'Features/Contribute/PageToasts',
  component: PageToasts,
  // A phone's screen: the toast floats at its top (transform-gpu holds the fixed toast inside).
  decorators: [
    (Story) => (
      <div className="h-150 w-97.5 transform-gpu bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
  args: { problem: null, isScreenFreeToSleep: false, mapNote: null },
} satisfies Meta<typeof PageToasts>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Location off for the app: the location arrow, in Content/error. */
export const LocationOff: Story = {
  args: { problem: LOCATION_OFF_PROBLEM },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('toast')).toHaveTextContent('Location is off for Para');
    await expect(canvas.getByRole('alert')).toHaveTextContent(/^Location is off for Para\. /);
  },
};

/** The browser blocks location for the page. */
export const LocationBlocked: Story = { args: { problem: LOCATION_BLOCKED_PROBLEM } };

/** The phone cannot work out where it is. */
export const PositionUnavailable: Story = { args: { problem: POSITION_UNAVAILABLE_PROBLEM } };

/** Finding the position took too long. */
export const PositionTimeout: Story = { args: { problem: POSITION_TIMEOUT_PROBLEM } };

/** The phone could not keep the recording: the warning circle. */
export const StorageNotKept: Story = { args: { problem: STORAGE_PROBLEM } };

/** Another tab holds the recorder. */
export const OtherTab: Story = { args: { problem: OTHER_TAB_PROBLEM } };

/** The phone refused to keep the screen awake while recording. */
export const ScreenMaySleep: Story = {
  args: { isScreenFreeToSleep: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('toast')).toHaveTextContent('Screen may sleep');
  },
};

/** The locator's note when the browser refuses it (its words are the locator's, locator-note.ts). */
const LOCATOR_NOTE: MapNoteGiven = {
  note: {
    id: 'location',
    title: 'Location is off for this site',
    body: 'Allow it in your browser settings, then try again.',
  },
  timesGiven: 1,
};

/** The map's locator has a note (the locate button tapped with location off): the location arrow. */
export const LocatorNote: Story = {
  args: { mapNote: LOCATOR_NOTE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('toast')).toHaveTextContent(
      'Location is off for this site',
    );
  },
};

/** The recorder and the locator both say location is wrong: one toast, the recorder's. */
export const RecorderAndLocator: Story = {
  args: { problem: LOCATION_BLOCKED_PROBLEM, mapNote: LOCATOR_NOTE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('toast')).toHaveTextContent('Location is blocked');
    // Closed, no second location toast waits behind it.
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(canvas.queryByTestId('toast')).toBeNull());
    // Long enough for a waiting toast to have come in after the closed one's exit.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await expect(canvas.queryByTestId('toast')).toBeNull();
  },
};

/** Two at once: one at a time, the recorder's first, the screen's after it is closed. */
export const TwoAtOnce: Story = {
  args: { problem: POSITION_UNAVAILABLE_PROBLEM, isScreenFreeToSleep: true },
};
