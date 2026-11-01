import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button } from '@/design-system/primitives/button';
import { AlertCircleIcon } from '@/design-system/primitives/field-icons';

import { StandingToasts, type StandingToast } from './standing-toasts';

const REFUSED = { title: 'Location is off for this site', body: 'Allow it, then try again.' };
const NO_FIX = { title: 'No fix yet', body: 'Try again outdoors.' };

/**
 * A page with one problem that can be asked again (a tap still refused), change its words, or be
 * fixed: the toasts follow the list.
 */
function Page() {
  const [problem, setProblem] = useState<{ words: typeof REFUSED; saying: number } | null>({
    words: REFUSED,
    saying: 1,
  });
  const toasts: StandingToast[] = problem
    ? [
        {
          id: 'location',
          saying: problem.saying,
          content: { kind: 'problem', icon: <AlertCircleIcon />, ...problem.words },
        },
      ]
    : [];
  return (
    <div className="flex flex-wrap gap-3 p-4 pt-32">
      <Button
        variant="secondary"
        label="Ask again"
        onClick={() => setProblem((last) => ({ words: REFUSED, saying: (last?.saying ?? 0) + 1 }))}
      />
      <Button
        variant="secondary"
        label="Other words"
        onClick={() => setProblem((last) => ({ words: NO_FIX, saying: last?.saying ?? 1 }))}
      />
      <Button variant="secondary" label="Fixed" onClick={() => setProblem(null)} />
      <StandingToasts toasts={toasts} />
    </div>
  );
}

const meta = {
  title: 'Shared/UI/StandingToasts',
  component: Page,
  // A phone's screen: the toast floats at its top (transform-gpu holds the fixed toast inside).
  decorators: [
    (Story) => (
      <div className="h-150 w-97.5 transform-gpu bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

const toastTitle = async (canvasElement: HTMLElement, title: string) =>
  waitFor(() =>
    expect(within(within(canvasElement).getByTestId('toast')).getByText(title)).toBeVisible(),
  );

/** The page's problem, said once. */
export const Said: Story = {
  play: async ({ canvasElement }) => {
    await toastTitle(canvasElement, REFUSED.title);
  },
};

/** Asked again twice while it shows: still the one toast. Closed with ✕, asked again: it is back. */
export const AskedAgain: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await toastTitle(canvasElement, REFUSED.title);
    await userEvent.click(canvas.getByRole('button', { name: 'Ask again' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Ask again' }));
    await expect(canvas.getAllByTestId('toast')).toHaveLength(1);
    await userEvent.click(
      within(canvas.getByTestId('toast')).getByRole('button', { name: 'Close' }),
    );
    await waitFor(() => expect(canvas.queryByTestId('toast')).toBeNull());
    await userEvent.click(canvas.getByRole('button', { name: 'Ask again' }));
    await toastTitle(canvasElement, REFUSED.title);
  },
};

/** New words for the same problem take the old ones' place. */
export const OtherWords: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await toastTitle(canvasElement, REFUSED.title);
    await userEvent.click(canvas.getByRole('button', { name: 'Other words' }));
    await toastTitle(canvasElement, NO_FIX.title);
    await expect(canvas.getAllByTestId('toast')).toHaveLength(1);
  },
};

/** Fixed: the toast is taken back. */
export const Fixed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await toastTitle(canvasElement, REFUSED.title);
    await userEvent.click(canvas.getByRole('button', { name: 'Fixed' }));
    await waitFor(() => expect(canvas.queryByTestId('toast')).toBeNull());
  },
};
