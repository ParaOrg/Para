import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClientProvider } from '@tanstack/react-query';
import { expect, fn, spyOn, userEvent, within } from 'storybook/test';

import { createQueryClient } from '@/shared/lib/query-client';

import { oldParaRouteKeys } from './old-para-route-keys';
import { OldParaRoutePicker } from './old-para-route-picker';
import type { OldParaRouteSummary } from './old-para-route-schema';
import { at, IKOT, NO_ENDS, NO_LINE } from './old-para-route-story-data';

const INDEX: OldParaRouteSummary[] = [IKOT, NO_LINE, NO_ENDS];

/** A client that already holds `index`, or none: the fetch stand-in then answers. */
const withIndex =
  (index: OldParaRouteSummary[] | null) =>
  (Story: () => React.JSX.Element): React.JSX.Element => {
    const client = createQueryClient();
    client.setQueryDefaults(oldParaRouteKeys.all, { staleTime: Infinity, retry: false });
    if (index) client.setQueryData(oldParaRouteKeys.index(), index);
    return (
      <QueryClientProvider client={client}>
        <div className="relative h-[40rem] w-[24rem] bg-surface-quaternary font-sn-pro">
          <Story />
        </div>
      </QueryClientProvider>
    );
  };

const FIELD = 'Name, place or Para ID';

const meta = {
  title: 'Features/Studio/OldParaRoutePicker',
  component: OldParaRoutePicker,
  decorators: [withIndex(INDEX)],
  parameters: { layout: 'padded' },
  args: {
    // On the Ikot's loop: the routes with no line are never near anything.
    mapCentre: () => at(2000, 500),
    onStartFromLine: fn(),
    onStartFromEnds: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof OldParaRoutePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opened, before anything is typed: what to do. */
export const NothingAsked: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Type a route’s name, a place on it/)).toBeVisible();
    await expect(canvas.getByText('Placeholder look')).toBeVisible();
  },
};

/** A place in the name finds its routes; each shows its mode, Para ID, verified, and no line. */
export const Results: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(FIELD), 'lagro');
    const list = canvas.getByRole('list', { name: 'Old Para routes' });
    await expect(within(list).getAllByRole('button')).toHaveLength(1);
    await expect(within(list).getByText('Bus · PARA-0049 · Unverified · No line')).toBeVisible();
  },
};

/** A Para ID typed whole, in any case, finds that route alone. */
export const ByParaId: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(FIELD), 'para-0001');
    const list = canvas.getByRole('list', { name: 'Old Para routes' });
    await expect(within(list).getByText('Jeepney · PARA-0001 · Verified')).toBeVisible();
  },
};

/** The routes with a line passing near the map's centre. */
export const NearTheCentre: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Routes near the map’s centre' }));
    const list = canvas.getByRole('list', { name: 'Old Para routes' });
    await expect(within(list).getAllByRole('button')).toHaveLength(1);
    await expect(within(list).getByText('UP - IKOT')).toBeVisible();
  },
};

/** A chosen route with no line: its card says how the drawing will begin. */
export const ChosenWithNoLine: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(FIELD), 'PARA-0049');
    await userEvent.click(canvas.getByRole('button', { name: /Alabang/ }));
    await expect(canvas.getByText(/Its start is placed and its end marked/)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Start drawing' }));
    await expect(args.onStartFromEnds).toHaveBeenCalledWith(NO_LINE);
  },
};

/** Nothing matches what was typed. */
export const NoMatch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(FIELD), 'zzzzqx');
    await expect(canvas.getByText('No old Para route matches.')).toBeVisible();
  },
};

/** The index on its way. */
export const Loading: Story = {
  decorators: [withIndex(null)],
  beforeEach: () => {
    // An answer that never comes, so the story stays on its way.
    const never = new Promise<Response>((resolve) => void resolve);
    spyOn(globalThis, 'fetch').mockReturnValue(never);
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Reading the old Para routes…')).toBeVisible();
  },
};

/** The index did not load: said, with a way to try again. */
export const Failed: Story = {
  decorators: [withIndex(null)],
  beforeEach: () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }));
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('The old Para routes didn’t load.')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Try again' })).toBeVisible();
  },
};
