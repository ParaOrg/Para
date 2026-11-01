import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { LoadProblemToast } from '@/features/published-map';

import { PageToasts } from './page-toasts';

const onTryAgain = fn();
const onReloadNewer = fn();

const FAILED: LoadProblemToast = {
  id: 'map-load',
  saying: 0,
  title: 'The routes could not load',
  body: 'Check your connection and try again.',
  action: { label: 'Try again', onAction: onTryAgain },
};

const TOO_NEW: LoadProblemToast = {
  id: 'map-load',
  saying: 0,
  title: 'This map needs a newer Para',
  body: 'Reload to update the app.',
  action: { label: 'Reload', onAction: onReloadNewer },
};

const meta = {
  title: 'App/PublicMap/PageToasts',
  component: PageToasts,
  // A phone's screen: the toast floats at its top (transform-gpu holds the fixed toast inside).
  decorators: [
    (Story) => (
      <div className="h-150 w-97.5 transform-gpu bg-surface-quaternary">
        <Story />
      </div>
    ),
  ],
  args: { locatorNote: null, load: null },
  beforeEach: () => {
    onTryAgain.mockClear();
    onReloadNewer.mockClear();
  },
} satisfies Meta<typeof PageToasts>;

export default meta;
type Story = StoryObj<typeof meta>;

const toast = (canvasElement: HTMLElement) => within(canvasElement).getByTestId('toast');

/** The browser refused the location: the locator's note, with the location drawing. */
export const LocationOff: Story = {
  args: {
    locatorNote: {
      note: {
        id: 'location',
        title: 'Location is off for this site',
        body: 'Allow it in your browser settings, then try again.',
      },
      saying: 1,
    },
  },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(within(toast(canvasElement)).getByText('Location is off for this site')).toBeVisible(),
    );
  },
};

/** The load failed: what happened, and Try again, which closes the toast. */
export const LoadFailed: Story = {
  args: { load: FAILED },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(within(toast(canvasElement)).getByText('The routes could not load')).toBeVisible(),
    );
    await userEvent.click(within(toast(canvasElement)).getByRole('button', { name: 'Try again' }));
    await expect(onTryAgain).toHaveBeenCalledOnce();
    await waitFor(() => expect(within(canvasElement).queryByTestId('toast')).toBeNull());
  },
};

/** A map published for a newer app: loading it again cannot help, so Reload fetches the newer app. */
export const TooNew: Story = {
  args: { load: TOO_NEW },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(within(toast(canvasElement)).getByText('This map needs a newer Para')).toBeVisible(),
    );
    await userEvent.click(within(toast(canvasElement)).getByRole('button', { name: 'Reload' }));
    await expect(onReloadNewer).toHaveBeenCalledOnce();
    await expect(onTryAgain).not.toHaveBeenCalled();
  },
};

/** Both at once: one at a time, the locator's note first, the failed load after its ✕. */
export const Both: Story = {
  args: {
    ...LocationOff.args,
    load: FAILED,
  },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(within(toast(canvasElement)).getByText('Location is off for this site')).toBeVisible(),
    );
    await userEvent.click(within(toast(canvasElement)).getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(within(toast(canvasElement)).getByText('The routes could not load')).toBeVisible(),
    );
  },
};
