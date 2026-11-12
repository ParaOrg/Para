import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { MapFailure } from './map-failure';

const meta = {
  title: 'Features/Routes/MapFailure',
  component: MapFailure,
  // Over a phone-sized map, where MapView draws it.
  decorators: [
    (Story) => (
      <div className="relative h-180 w-97.5 overflow-clip bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'centered' },
  args: {
    message: 'Failed to fetch',
    diagnosis: null,
    dom: null,
    trace: [],
    styleUrl: 'https://tiles.openfreemap.org/styles/positron',
    showsDiagnostics: true,
  },
} satisfies Meta<typeof MapFailure>;

export default meta;
type Story = StoryObj<typeof meta>;

/** What a commuter and a contributor read: the one line, and none of the diagnostics. */
export const OutsideTheStudio: Story = {
  args: {
    showsDiagnostics: false,
    diagnosis: { webgl: 'webgl2', renderer: 'Adreno (TM) 610', styleFetch: 'HTTP 503 after 80ms' },
    trace: ['styledata@212ms'],
  },
  play: async ({ canvasElement }) => {
    const box = within(canvasElement);
    await expect(box.getByText('The map failed to load.')).toBeVisible();
    for (const diagnostic of [/Failed to fetch/, /webgl2/, /Adreno/, /HTTP 503/, /styledata/]) {
      await expect(box.queryByText(diagnostic)).toBeNull();
    }
    await expect(box.queryByText(/tiles\.openfreemap\.org/)).toBeNull();
  },
};

/** In the studio, just failed: the message and the style's address, before the device has answered. */
export const JustFailed: Story = {};

/** The device has answered: WebGL, the renderer, the style's fetch, the container and the events. */
export const WithItsDiagnosis: Story = {
  args: {
    message: 'The map did not finish loading in 12 seconds.',
    diagnosis: {
      webgl: 'webgl2',
      renderer: 'ANGLE (Qualcomm, Adreno (TM) 610, OpenGL ES 3.2)',
      styleFetch: 'HTTP 200, 58211 bytes in 412ms',
    },
    dom: 'canvas 786×1704 (css 393×852)',
    trace: ['styledata@212ms', 'sourcedata@240ms', 'render@301ms'],
  },
  play: async ({ canvasElement }) => {
    const box = within(canvasElement);
    for (const diagnostic of [
      'The map failed to load.',
      'The map did not finish loading in 12 seconds.',
      'webgl2',
      'ANGLE (Qualcomm, Adreno (TM) 610, OpenGL ES 3.2)',
      'HTTP 200, 58211 bytes in 412ms',
      'canvas 786×1704 (css 393×852)',
      'styledata@212ms → sourcedata@240ms → render@301ms',
      'https://tiles.openfreemap.org/styles/positron',
    ]) {
      await expect(box.getByText(diagnostic)).toBeVisible();
    }
  },
};

/** Nothing fired, a renderer the browser hides, and words that must wrap, not spill. */
export const LongAndEmpty: Story = {
  args: {
    message:
      'AJAXError: Failed to fetch (0): https://tiles.openfreemap.org/styles/positron-with-a-very-long-name-that-has-nowhere-to-break',
    diagnosis: {
      webgl: 'none',
      renderer: null,
      styleFetch: 'fetch threw after 30012ms: Failed to fetch',
    },
    styleUrl:
      'https://tiles.openfreemap.org/styles/positron-with-a-very-long-name-that-has-nowhere-to-break',
  },
};
