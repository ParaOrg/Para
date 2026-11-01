import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button } from '@/design-system/primitives/button';
import { AlertCircleIcon } from '@/design-system/primitives/field-icons';

import { InformationIcon } from './route-icons';
import { ToastHost } from './toast-host';
import { INFO_TOAST_MS } from './toast-queue';
import { useToast } from './use-toast';

/** Buttons a screen might have: an info, a problem, an info with an action, a problem with one. */
function Asker() {
  const { showToast } = useToast();
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
        label="Say info with an action"
        onClick={() =>
          showToast({
            kind: 'info',
            icon: <InformationIcon />,
            title: 'Saved on this phone',
            action: { label: 'History', onAction: () => undefined },
          })
        }
      />
      <Button
        variant="secondary"
        label="Say a fix"
        onClick={() =>
          showToast({
            kind: 'problem',
            icon: <AlertCircleIcon />,
            title: 'Location is off',
            action: { label: 'Retry', onAction: () => undefined },
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
 * One at a time, in the order asked: the problem waits for the info to go. Info is spoken
 * politely (role=status), a problem at once (role=alert), and neither takes focus.
 */
export const Queue: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sayInfo = canvas.getByRole('button', { name: 'Say info' });
    await userEvent.click(sayInfo);
    await userEvent.click(canvas.getByRole('button', { name: 'Say a problem' }));
    // Visible once it has slid in.
    await waitFor(() =>
      expect(within(canvas.getByRole('status')).getByText('Saved on this phone')).toBeVisible(),
    );
    await expect(canvas.getAllByTestId('toast')).toHaveLength(1);
    await expect(canvas.getByRole('button', { name: 'Say a problem' })).toHaveFocus();
    await userEvent.click(
      within(canvas.getByRole('status')).getByRole('button', { name: 'Close' }),
    );
    await waitFor(() =>
      expect(within(canvas.getByRole('alert')).getByText('Couldn’t upload')).toBeVisible(),
    );
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

/**
 * Focus in it holds info past its time, Tab moving between its buttons too; focus gone, it goes.
 */
export const InfoHeldWhileFocused: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Say info with an action' }));
    await waitFor(() => expect(canvas.getByTestId('toast')).toBeVisible());
    // The toast follows the screen's buttons in the page's order.
    await userEvent.tab();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'History' })).toHaveFocus();
    await wait(INFO_TOAST_MS + 500);
    await expect(canvas.getByTestId('toast')).toBeVisible();
    await userEvent.tab();
    await expect(
      within(canvas.getByTestId('toast')).getByRole('button', { name: 'Close' }),
    ).toHaveFocus();
    await wait(INFO_TOAST_MS + 500);
    await expect(canvas.getByTestId('toast')).toBeVisible();
    await userEvent.tab({ shift: true });
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
