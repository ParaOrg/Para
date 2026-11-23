import { expect, waitFor, within } from 'storybook/test';

/**
 * For a story's play: waits until the screen's heading has taken focus, as it does in an effect
 * once the screen opens (useFocusHeading). That effect can land after the play's first click, and
 * a key typed then goes to the heading, not the field: so a story that types waits for it first.
 */
export async function waitForHeadingFocus(canvasElement: HTMLElement): Promise<void> {
  await waitFor(() =>
    expect(within(canvasElement).getByRole('heading', { level: 1 })).toHaveFocus(),
  );
}
