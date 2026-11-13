import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

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
import type { RouteRecordedGiven } from './route-recorded';
import { uploadFailedProblem } from './upload-failed-problem';
import type { UploadStatus } from '../uploads/upload-state';

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
  args: {
    problem: null,
    isScreenFreeToSleep: false,
    mapNote: null,
    stopsFlagged: 0,
    onAddNote: fn(),
    canAddNote: true,
    routeRecorded: null,
    uploadProblem: null,
  },
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

/**
 * In the app, the locate button tapped with the phone's location off and Google's "Turn on
 * location?" dialog declined (its words are the locator's, locator-note.ts LOCATION_OFF_NOTE).
 */
export const LocatorLocationOffInTheApp: Story = {
  args: {
    mapNote: {
      note: {
        id: 'location',
        title: 'Location is off',
        body: 'Turn it on in Quick Settings to see where you are.',
      },
      timesGiven: 1,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('toast')).toHaveTextContent('Location is off');
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'Location is off. Turn it on in Quick Settings to see where you are.',
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

/** A stop just flagged: "Stop flagged" with the flag and Add a note, gone by itself after 5 s. */
export const StopFlagged: Story = {
  args: { stopsFlagged: 1 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('toast')).toHaveTextContent('Stop flagged');
    await expect(canvas.getByRole('status')).toHaveTextContent('Stop flagged');
    await expect(canvas.getByRole('button', { name: 'Add a note' })).toBeVisible();
  },
};

/** Add a note, on Stop flagged: it opens the note, and the toast goes. */
export const AddANote: Story = {
  args: { stopsFlagged: 1 },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: 'Add a note' }));
    await expect(args.onAddNote).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByTestId('toast')).toBeNull());
  },
};

/** A save, as the page tells of it: the toasts put it in words (route-recorded.ts). */
const saved = (
  status: UploadStatus,
  isOnline: boolean,
  failedFixWrites = 0,
): RouteRecordedGiven => ({ status, isOnline, failedFixWrites, times: 1 });

/** A route just saved and on its way: "Route recorded", with the check, leaving by itself. */
export const RouteRecordedOnItsWay: Story = {
  args: { routeRecorded: saved({ state: 'uploading' }, true) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('toast')).toHaveTextContent('Route recorded');
    await expect(canvas.getByRole('status')).toHaveTextContent(/^Route recorded\. Thanks!/);
  },
};

/** Saved with no signal: kept on the phone until it is online. */
export const RouteRecordedOffline: Story = {
  args: { routeRecorded: saved({ state: 'waiting' }, false) },
};

/** Saved where it is not sent by itself (uploads off, or no consent yet): kept on the phone. */
export const RouteRecordedKept: Story = {
  args: { routeRecorded: saved({ state: 'unavailable' }, true) },
};

/** Saved with points the phone could not keep: "Route recorded", then the problem, until ✕. */
export const RouteRecordedPointsLost: Story = {
  args: { routeRecorded: saved({ state: 'uploading' }, true, 3) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('toast')).toHaveTextContent('Route recorded');
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    // Once it has slid in: it starts at opacity 0.
    await waitFor(() => expect(canvas.getByText('Part of the ride wasn’t kept')).toBeVisible());
    await expect(canvas.getByRole('alert')).toHaveTextContent('couldn’t keep 3 points');
  },
};

/** The just-saved route's upload failed: a problem, in the failure's own words, until it goes. */
export const UploadFailed: Story = {
  args: {
    uploadProblem: uploadFailedProblem({
      state: 'failed',
      message: "Para's checks refused this recording. It stays on this phone.",
      brief: "Refused by Para's checks",
      willRetry: false,
    }),
  },
};
