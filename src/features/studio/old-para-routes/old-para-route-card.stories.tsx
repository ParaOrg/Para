import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClientProvider } from '@tanstack/react-query';
import { expect, fn, spyOn, userEvent, within } from 'storybook/test';

import { createQueryClient } from '@/shared/lib/query-client';

import { OldParaRouteCard } from './old-para-route-card';
import { oldParaRouteKeys } from './old-para-route-keys';
import type { OldParaRoute } from './old-para-route-schema';
import { CUBAO, CUBAO_FILE, IKOT, IKOT_FILE, NO_ENDS, NO_LINE } from './old-para-route-story-data';

/** A client that already holds the route's file, or none: the fetch stand-in then answers. */
const holding =
  (file: OldParaRoute | null) =>
  (Story: () => React.JSX.Element): React.JSX.Element => {
    const client = createQueryClient();
    client.setQueryDefaults(oldParaRouteKeys.all, { staleTime: Infinity, retry: false });
    if (file) client.setQueryData(oldParaRouteKeys.route(file.paraId), file);
    return (
      <QueryClientProvider client={client}>
        <div className="flex w-80 flex-col gap-3 rounded-2xl bg-surface p-4 font-sn-pro text-sm text-content-secondary">
          <Story />
        </div>
      </QueryClientProvider>
    );
  };

const meta = {
  title: 'Features/Studio/OldParaRouteCard',
  component: OldParaRouteCard,
  decorators: [holding(CUBAO_FILE)],
  parameters: { layout: 'padded' },
  args: { route: CUBAO, onStartFromLine: fn(), onStartFromEnds: fn(), onBack: fn() },
} satisfies Meta<typeof OldParaRouteCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** End to end, never reviewed, its line with a gap: Start drawing with the whole line. */
export const WithLine: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Jeepney · PARA-0018 · Unverified')).toBeVisible();
    await expect(canvas.getByText('End to end · both ways · 11.2 km')).toBeVisible();
    await expect(canvas.getByText(/1 gaps in its line/)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Start drawing' }));
    await expect(args.onStartFromLine).toHaveBeenCalledWith(CUBAO_FILE, CUBAO_FILE);
  },
};

/** The verified UP Ikot, a loop: each half is drawn on its own. */
export const Loop: Story = {
  decorators: [holding(IKOT_FILE)],
  args: { route: IKOT },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Verified by the old app’s reviewers/)).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Draw the way out' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Draw the way back' })).toBeVisible();
  },
};

/** No line: its start is placed and its end marked for the editor to draw to. */
export const NoLine: Story = {
  args: { route: NO_LINE },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Bus · PARA-0049 · Unverified · No line')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Start drawing' }));
    await expect(args.onStartFromEnds).toHaveBeenCalledWith(NO_LINE);
  },
};

/** No line and neither end: drawn by hand from nothing. */
export const NoEnds: Story = {
  args: { route: NO_ENDS },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/neither end known/)).toBeVisible();
  },
};

/** The line's file on its way. */
export const Loading: Story = {
  decorators: [holding(null)],
  beforeEach: () => {
    const never = new Promise<Response>((resolve) => void resolve);
    spyOn(globalThis, 'fetch').mockReturnValue(never);
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Reading PARA-0018’s line…')).toBeVisible();
  },
};

/** The line's file did not load: said, with Try again and Back. */
export const Failed: Story = {
  decorators: [holding(null)],
  beforeEach: () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('PARA-0018’s line didn’t load.')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Back to the list' })).toBeVisible();
  },
};
