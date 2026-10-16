import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { VehicleIcon } from './vehicle-icon';

const meta = {
  title: 'Features/Routes/VehicleIcon',
  component: VehicleIcon,
  decorators: [
    (Story) => (
      // As its callers hold it: the size is theirs (32 in a trip's header), the colour the text's.
      <div className="p-4">
        <span aria-hidden className="inline-flex size-8 text-content-primary *:size-full">
          <Story />
        </span>
      </div>
    ),
  ],
  args: { vehicle: 'LRT-1' },
} satisfies Meta<typeof VehicleIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The drawing the story renders, and the sprite id it points at. */
const spriteOf = (root: HTMLElement): { svg: SVGSVGElement; id: string | undefined } => {
  const svg = root.querySelector('svg');
  if (!svg) throw new Error('no icon rendered');
  const href = svg.querySelector('use')?.getAttribute('href') ?? '';
  return { svg, id: href.split('#')[1] };
};

/** Drawn in currentColor from the sprite, 32 across, hidden from a screen reader. */
const expectDrawn = async (root: HTMLElement, id: string) => {
  const { svg, id: drawn } = spriteOf(root);
  await expect(drawn).toBe(id);
  await expect(svg.getAttribute('aria-hidden')).toBe('true');
  await expect(getComputedStyle(svg).fill).toBe(getComputedStyle(svg).color);
  await expect(svg.getBoundingClientRect().width).toBe(32);
};

/** LRT-1 (Default, 4181:10844): the train. */
export const Lrt1: Story = {
  play: async ({ canvasElement }) => expectDrawn(canvasElement, 'train'),
};

/** LRT-2 draws the same train as LRT-1: the line's colour is the card's, not the icon's. */
export const Lrt2: Story = {
  args: { vehicle: 'LRT-2' },
  play: async ({ canvasElement }) => expectDrawn(canvasElement, 'train'),
};

/** MRT-3 draws the same train too. */
export const Mrt3: Story = {
  args: { vehicle: 'MRT-3' },
  play: async ({ canvasElement }) => expectDrawn(canvasElement, 'train'),
};

/** Jeepney (Variant2). */
export const Jeepney: Story = {
  args: { vehicle: 'Jeepney' },
  play: async ({ canvasElement }) => expectDrawn(canvasElement, 'jeepney'),
};

/** E-Jeep (Variant4). */
export const EJeep: Story = {
  args: { vehicle: 'E-Jeep' },
  play: async ({ canvasElement }) => expectDrawn(canvasElement, 'e-jeep'),
};

/** Bus (Variant3). */
export const Bus: Story = {
  args: { vehicle: 'Bus' },
  play: async ({ canvasElement }) => expectDrawn(canvasElement, 'bus'),
};

/** Ferry (Variant5). */
export const Ferry: Story = {
  args: { vehicle: 'Ferry' },
  play: async ({ canvasElement }) => expectDrawn(canvasElement, 'ferry'),
};
