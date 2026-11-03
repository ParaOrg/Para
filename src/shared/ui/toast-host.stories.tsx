import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button } from '@/design-system/primitives/button';
import { AlertCircleIcon } from '@/design-system/primitives/field-icons';
import { IconButton } from '@/design-system/primitives/icon-button';

import { CloseIcon, InformationIcon } from './route-icons';
import { ToastHost } from './toast-host';
import { INFO_TOAST_MS } from './toast-queue';
import { useToast } from './use-toast';

/** The problem a fix takes back: hideToast names it by the id it was shown with. */
const FIX_ID = 'location-off';

/**
 * Buttons a screen might have: an info, a problem, word that the fix landed (a second later, as a
 * screen hears it), a problem with an action, and a compact info.
 */
function Asker() {
  const { showToast, hideToast } = useToast();
  return (
    <div className="flex flex-wrap gap-3 p-4 pt-32">
      <Button
        variant="secondary"
        label="Say info"
        onClick={() =>
          showToast({ kind: 'info', icon: <InformationIcon />, title: 'Saved on this phone' })
        }
      />
      <Button
        variant="secondary"
        label="Say a problem"
        onClick={() =>
          showToast({
            kind: 'problem',
            icon: <AlertCircleIcon />,
            title: 'Couldn’t upload',
            body: 'No signal. We’ll try again when you’re back online.',
          })
        }
      />
      <Button
        variant="secondary"
        label="Fixed in a second"
        onClick={() => window.setTimeout(() => hideToast(FIX_ID), 1000)}
      />
      <Button
        variant="secondary"
        label="Say a fix"
        onClick={() =>
          showToast({
            kind: 'problem',
            icon: <AlertCircleIcon />,
            id: FIX_ID,
            title: 'Location is off',
            action: { label: 'Retry', onAction: () => undefined },
          })
        }
      />
      <Button
        variant="secondary"
        label="Say it short"
        onClick={() =>
          showToast({
            kind: 'info',
            size: 'compact',
            icon: <InformationIcon />,
            title: 'Route reversed',
          })
        }
      />
    </div>
  );
}

const meta = {
  title: 'Shared/UI/ToastHost',
  component: ToastHost,
  // A phone's screen: the host floats its toast at the top of it (transform-gpu holds the fixed
  // toast inside this frame, as a phone's screen would).
  decorators: [
    (Story) => (
      <div className="h-150 w-97.5 transform-gpu bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
  args: { children: <Asker /> },
} satisfies Meta<typeof ToastHost>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * One at a time, in the order asked: the problem waits for the info to go. Screen readers hear the
 * words only, politely for info (role=status) and at once for a problem (role=alert), never the
 * buttons; and the toast takes no focus.
 */
export const Queue: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Say info' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Say a problem' }));
    // Visible once it has slid in.
    await waitFor(() =>
      expect(within(canvas.getByTestId('toast')).getByText('Saved on this phone')).toBeVisible(),
    );
    await expect(canvas.getAllByTestId('toast')).toHaveLength(1);
    await expect(canvas.getByRole('status')).toHaveTextContent(/^Saved on this phone$/);
    await expect(canvas.getByRole('alert')).toHaveTextContent(/^$/);
    await expect(canvas.getByRole('button', { name: 'Say a problem' })).toHaveFocus();
    await userEvent.click(
      within(canvas.getByTestId('toast')).getByRole('button', { name: 'Close' }),
    );
    await waitFor(() =>
      expect(canvas.getByRole('alert')).toHaveTextContent(
        /^Couldn’t upload\. No signal\. We’ll try again when you’re back online\.$/,
      ),
    );
    await waitFor(() =>
      expect(within(canvas.getByTestId('toast')).getByText('Couldn’t upload')).toBeVisible(),
    );
    await expect(canvas.getByRole('status')).toHaveTextContent(/^$/);
  },
};

/** Asked three times, the same problem is said once: one ✕ closes it, and nothing follows. */
export const SameProblemOnce: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sayProblem = canvas.getByRole('button', { name: 'Say a problem' });
    await userEvent.click(sayProblem);
    await userEvent.click(sayProblem);
    await userEvent.click(sayProblem);
    await waitFor(() => expect(canvas.getByTestId('toast')).toBeVisible());
    await userEvent.click(
      within(canvas.getByTestId('toast')).getByRole('button', { name: 'Close' }),
    );
    await waitFor(() => expect(canvas.queryByTestId('toast')).toBeNull());
    await wait(500);
    await expect(canvas.queryByTestId('toast')).toBeNull();
  },
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Info goes by itself after INFO_TOAST_MS. */
export const InfoHidesItself: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Say info' }));
    await waitFor(() => expect(canvas.getByTestId('toast')).toBeVisible());
    await waitFor(() => expect(canvas.queryByTestId('toast')).toBeNull(), {
      timeout: INFO_TOAST_MS + 2000,
    });
  },
};

/** Compact info goes by itself as info does, and screen readers hear it politely. */
export const CompactHidesItself: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Say it short' }));
    await waitFor(() => expect(canvas.getByTestId('toast')).toBeVisible());
    await expect(canvas.getByTestId('toast')).toHaveAttribute('data-size', 'compact');
    await expect(canvas.getByRole('status')).toHaveTextContent(/^Route reversed$/);
    await expect(canvas.getByRole('alert')).toHaveTextContent(/^$/);
    await waitFor(() => expect(canvas.queryByTestId('toast')).toBeNull(), {
      timeout: INFO_TOAST_MS + 2000,
    });
  },
};

/** Info asked again while it shows is refreshed in place: its clock starts again. */
export const SameInfoRefreshed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sayInfo = canvas.getByRole('button', { name: 'Say info' });
    await userEvent.click(sayInfo);
    await waitFor(() => expect(canvas.getByTestId('toast')).toBeVisible());
    await wait(INFO_TOAST_MS - 1000);
    await userEvent.click(sayInfo);
    await wait(2000);
    await expect(canvas.getAllByTestId('toast')).toHaveLength(1);
    await expect(canvas.getByTestId('toast')).toBeVisible();
    await waitFor(() => expect(canvas.queryByTestId('toast')).toBeNull(), {
      timeout: INFO_TOAST_MS + 2000,
    });
  },
};

/** Pointed at, info stays past its time; let go, it goes. */
export const InfoHeldWhilePointedAt: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Say info' }));
    await waitFor(() => expect(canvas.getByTestId('toast')).toBeVisible());
    await userEvent.hover(canvas.getByTestId('toast'));
    await wait(INFO_TOAST_MS + 500);
    await expect(canvas.getByTestId('toast')).toBeVisible();
    await userEvent.unhover(canvas.getByTestId('toast'));
    await waitFor(() => expect(canvas.queryByTestId('toast')).toBeNull(), {
      timeout: INFO_TOAST_MS + 2000,
    });
  },
};

/** Focus in it holds info past its time; focus gone, it goes. */
export const InfoHeldWhileFocused: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Say a fix' }));
    await waitFor(() => expect(canvas.getByTestId('toast')).toBeVisible());
    await userEvent.click(
      within(canvas.getByTestId('toast')).getByRole('button', { name: 'Close' }),
    );
    await waitFor(() => expect(canvas.queryByTestId('toast')).toBeNull());
    await userEvent.click(canvas.getByRole('button', { name: 'Say info' }));
    await waitFor(() => expect(canvas.getByTestId('toast')).toBeVisible());
    // The toast follows the screen's buttons in the page's order: Say a fix, then its ✕.
    canvas.getByRole('button', { name: 'Say a fix' }).focus();
    await userEvent.tab();
    await expect(
      within(canvas.getByTestId('toast')).getByRole('button', { name: 'Close' }),
    ).toHaveFocus();
    await wait(INFO_TOAST_MS + 500);
    await expect(canvas.getByTestId('toast')).toBeVisible();
    await userEvent.tab({ shift: true });
    await expect(canvas.getByRole('button', { name: 'Say a fix' })).toHaveFocus();
    await waitFor(() => expect(canvas.queryByTestId('toast')).toBeNull(), {
      timeout: INFO_TOAST_MS + 2000,
    });
  },
};

/**
 * A problem stays past info's time; its action does its thing and closes it, and the keyboard's
 * place goes back to where it was before it came into the toast.
 */
export const ProblemStaysUntilItsAction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sayFix = canvas.getByRole('button', { name: 'Say a fix' });
    await userEvent.click(sayFix);
    await waitFor(() => expect(canvas.getByTestId('toast')).toBeVisible());
    await wait(INFO_TOAST_MS + 500);
    await expect(canvas.getByTestId('toast')).toBeVisible();
    // The toast follows the screen in the page's order: one Tab from Say a fix reaches its action.
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Retry' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(canvas.queryByTestId('toast')).toBeNull());
    await expect(sayFix).toHaveFocus();
  },
};

/**
 * hideToast takes a toast back. Showing, it leaves as ✕ makes it, though focus and the pointer are
 * in it, and focus goes back where it came from; waiting, it leaves the queue and never shows.
 */
export const HiddenByItsId: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sayFix = canvas.getByRole('button', { name: 'Say a fix' });
    const fixed = canvas.getByRole('button', { name: 'Fixed in a second' });
    // Showing, held both ways.
    await userEvent.click(sayFix);
    await waitFor(() => expect(canvas.getByTestId('toast')).toBeVisible());
    await userEvent.click(fixed);
    sayFix.focus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Retry' })).toHaveFocus();
    await userEvent.hover(canvas.getByTestId('toast'));
    await waitFor(() => expect(canvas.queryByTestId('toast')).toBeNull(), { timeout: 3000 });
    await expect(sayFix).toHaveFocus();
    // Waiting behind an info: it never shows.
    await userEvent.click(canvas.getByRole('button', { name: 'Say info' }));
    await userEvent.click(sayFix);
    await userEvent.click(fixed);
    await wait(1500);
    await userEvent.click(
      within(canvas.getByTestId('toast')).getByRole('button', { name: 'Close' }),
    );
    await waitFor(() => expect(canvas.queryByTestId('toast')).toBeNull());
    await wait(500);
    await expect(canvas.queryByTestId('toast')).toBeNull();
    // An id the host does not have does nothing.
    await userEvent.click(fixed);
    await wait(1500);
    await expect(canvas.queryByTestId('toast')).toBeNull();
  },
};

/** A page's own 48 px top row, as the contributor's Recording screen draws one, with its ✕. */
function TopRow() {
  return (
    <div
      data-testid="top-row"
      className="flex h-12 items-center justify-between bg-surface px-4 font-sn-pro text-content-primary"
    >
      <span className="font-bold">Recording</span>
      <IconButton icon={<CloseIcon />} label="Stop" size="small" tooltip="top" />
    </div>
  );
}

/**
 * On a page with its own top row, `--toast-top` (the row's 48 plus 12) puts the card under it, so
 * the row's ✕ stays in reach.
 */
export const UnderATopRow: Story = {
  args: {
    children: (
      <>
        <TopRow />
        <Asker />
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div className="h-full [--toast-top:calc(--spacing(12)+--spacing(3))]">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Say a problem' }));
    await waitFor(() => expect(canvas.getByTestId('toast')).toBeVisible());
    const row = canvas.getByTestId('top-row').getBoundingClientRect();
    await waitFor(() =>
      expect(canvas.getByTestId('toast').getBoundingClientRect().top).toBe(row.bottom + 12),
    );
    await expect(canvas.getByRole('button', { name: 'Stop' })).toBeVisible();
  },
};
