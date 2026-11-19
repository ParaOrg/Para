import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';

/**
 * The redesign's tokens (the second half of tokens.css): the Figma file's new Semantics collection
 * and the 15-step primitives it aliases. Each swatch wears the utility class printed under it, so a
 * drift between Figma and the code shows here. The deprecated semantics keep their own page
 * (tokens.stories.tsx). This page's own chrome uses only the new semantics.
 */

interface SwatchProps {
  /** The variable's name in Figma, spelled as Figma spells it. */
  figma: string;
  kind: 'text' | 'bg' | 'border';
  /** The utility class the code uses for it. */
  cls: string;
}

function Swatch({ figma, kind, cls }: SwatchProps) {
  return (
    <div className="w-40">
      {kind === 'text' && <p className={'text-lg font-semibold ' + cls}>Aa Cubao</p>}
      {kind === 'bg' && <div className={'h-14 rounded-lg border border-stroke-default ' + cls} />}
      {kind === 'border' && <div className={'h-14 rounded-lg border-4 bg-bg-surface ' + cls} />}
      <p className="mt-1.5 text-xs font-medium break-all text-text-primary">{figma}</p>
      <p className="font-mono text-xs break-all text-text-tertiary">{cls}</p>
    </div>
  );
}

interface GroupProps {
  title: string;
  children: ReactNode;
}

function Group({ title, children }: GroupProps) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-semibold text-text-primary">{title}</h2>
      <div className="flex flex-wrap gap-4">{children}</div>
    </section>
  );
}

/** One family's 15 steps. The classes are written out: Tailwind cannot see built names. */
interface RampProps {
  /** The family's name in Figma. */
  name: string;
  /** Its steps' classes, 1 to 15, written out so Tailwind sees them. */
  boxes: readonly string[];
}

function Ramp({ name, boxes }: RampProps) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-text-primary">{name}</p>
      <div className="flex">
        {boxes.map((cls, i) => (
          <div key={cls} className="w-10">
            <div className={'h-10 ' + cls} />
            <p className="mt-0.5 text-center text-xs text-text-tertiary">{i + 1}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const meta = { title: 'DesignSystem/Foundation/SemanticTokens' } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The new Semantics collection, as Figma groups it. */
export const Semantics: Story = {
  render: () => (
    <div className="bg-bg-surface p-6">
      <Group title="Text">
        <Swatch figma="text/primary" kind="text" cls="text-text-primary" />
        <Swatch figma="text/secondary" kind="text" cls="text-text-secondary" />
        <Swatch figma="text/tertiary" kind="text" cls="text-text-tertiary" />
        <Swatch figma="text/quarternnary" kind="text" cls="text-text-quaternary" />
        <Swatch figma="text/on-text" kind="text" cls="text-text-on-fill" />
      </Group>
      <Group title="Background">
        <Swatch figma="bg/surface/surface" kind="bg" cls="bg-bg-surface" />
        <Swatch figma="bg/surface/surface-secondary" kind="bg" cls="bg-bg-surface-secondary" />
        <Swatch figma="bg/fill/fill" kind="bg" cls="bg-bg-fill" />
        <Swatch figma="bg/fill/fill-secondary" kind="bg" cls="bg-bg-fill-secondary" />
      </Group>
      <Group title="Border">
        <Swatch figma="border/border-light" kind="border" cls="border-stroke-light" />
        <Swatch figma="border/border" kind="border" cls="border-stroke-default" />
        <Swatch figma="border/border-secondary" kind="border" cls="border-stroke-secondary" />
        <Swatch figma="border/border-tertiary" kind="border" cls="border-stroke-tertiary" />
        <Swatch figma="border/border-quarternary" kind="border" cls="border-stroke-quaternary" />
        <Swatch figma="border/border-dark" kind="border" cls="border-stroke-dark" />
      </Group>
      <Group title="Direction">
        <Swatch figma="direction/start/fill" kind="bg" cls="bg-direction-start-fill" />
        <Swatch figma="direction/start/surface" kind="bg" cls="bg-direction-start-surface" />
        <Swatch figma="direction/end/fill" kind="bg" cls="bg-direction-end-fill" />
        <Swatch figma="direction/end/surface" kind="bg" cls="bg-direction-end-surface" />
      </Group>
      <Group title="Card">
        <Swatch figma="card/jeep/fill" kind="bg" cls="bg-card-jeep-fill" />
        <Swatch figma="card/UVExpress/fill" kind="bg" cls="bg-card-uv-express-fill" />
        <Swatch figma="card/Bus/fill" kind="bg" cls="bg-card-bus-fill" />
        <Swatch figma="card/ferry/fill" kind="bg" cls="bg-card-ferry-fill" />
        <Swatch figma="card/LRTOne/fill" kind="bg" cls="bg-card-lrt-one-fill" />
        <Swatch figma="card/LRTTwo/fill" kind="bg" cls="bg-card-lrt-two-fill" />
        <Swatch figma="card/MRTThree/fill" kind="bg" cls="bg-card-mrt-three-fill" />
      </Group>
      <Group title="Special">
        <Swatch figma="special/fill" kind="bg" cls="bg-special-fill" />
        <Swatch figma="special/green/fill" kind="bg" cls="bg-special-green-fill" />
        <Swatch figma="special/green/surface" kind="bg" cls="bg-special-green-surface" />
        <Swatch figma="special/orange/fill" kind="bg" cls="bg-special-orange-fill" />
        <Swatch figma="special/orange/surface" kind="bg" cls="bg-special-orange-surface" />
      </Group>
    </div>
  ),
};

/** The 15-step primitives the new semantics alias. */
export const Primitives: Story = {
  render: () => (
    <div className="flex flex-col gap-6 bg-bg-surface p-6">
      <Ramp
        name="color/neutral"
        boxes={[
          'bg-neutral-1',
          'bg-neutral-2',
          'bg-neutral-3',
          'bg-neutral-4',
          'bg-neutral-5',
          'bg-neutral-6',
          'bg-neutral-7',
          'bg-neutral-8',
          'bg-neutral-9',
          'bg-neutral-10',
          'bg-neutral-11',
          'bg-neutral-12',
          'bg-neutral-13',
          'bg-neutral-14',
          'bg-neutral-15',
        ]}
      />
      <Ramp
        name="color/red"
        boxes={[
          'bg-red-1',
          'bg-red-2',
          'bg-red-3',
          'bg-red-4',
          'bg-red-5',
          'bg-red-6',
          'bg-red-7',
          'bg-red-8',
          'bg-red-9',
          'bg-red-10',
          'bg-red-11',
          'bg-red-12',
          'bg-red-13',
          'bg-red-14',
          'bg-red-15',
        ]}
      />
      <Ramp
        name="color/orange"
        boxes={[
          'bg-orange-1',
          'bg-orange-2',
          'bg-orange-3',
          'bg-orange-4',
          'bg-orange-5',
          'bg-orange-6',
          'bg-orange-7',
          'bg-orange-8',
          'bg-orange-9',
          'bg-orange-10',
          'bg-orange-11',
          'bg-orange-12',
          'bg-orange-13',
          'bg-orange-14',
          'bg-orange-15',
        ]}
      />
      <Ramp
        name="color/green"
        boxes={[
          'bg-green-1',
          'bg-green-2',
          'bg-green-3',
          'bg-green-4',
          'bg-green-5',
          'bg-green-6',
          'bg-green-7',
          'bg-green-8',
          'bg-green-9',
          'bg-green-10',
          'bg-green-11',
          'bg-green-12',
          'bg-green-13',
          'bg-green-14',
          'bg-green-15',
        ]}
      />
      <Ramp
        name="color/blue"
        boxes={[
          'bg-blue-1',
          'bg-blue-2',
          'bg-blue-3',
          'bg-blue-4',
          'bg-blue-5',
          'bg-blue-6',
          'bg-blue-7',
          'bg-blue-8',
          'bg-blue-9',
          'bg-blue-10',
          'bg-blue-11',
          'bg-blue-12',
          'bg-blue-13',
          'bg-blue-14',
          'bg-blue-15',
        ]}
      />
      <Ramp
        name="color/light-rail-way-one"
        boxes={[
          'bg-light-rail-way-one-1',
          'bg-light-rail-way-one-2',
          'bg-light-rail-way-one-3',
          'bg-light-rail-way-one-4',
          'bg-light-rail-way-one-5',
          'bg-light-rail-way-one-6',
          'bg-light-rail-way-one-7',
          'bg-light-rail-way-one-8',
          'bg-light-rail-way-one-9',
          'bg-light-rail-way-one-10',
          'bg-light-rail-way-one-11',
          'bg-light-rail-way-one-12',
          'bg-light-rail-way-one-13',
          'bg-light-rail-way-one-14',
          'bg-light-rail-way-one-15',
        ]}
      />
      <Ramp
        name="color/light-rail-way-two"
        boxes={[
          'bg-light-rail-way-two-1',
          'bg-light-rail-way-two-2',
          'bg-light-rail-way-two-3',
          'bg-light-rail-way-two-4',
          'bg-light-rail-way-two-5',
          'bg-light-rail-way-two-6',
          'bg-light-rail-way-two-7',
          'bg-light-rail-way-two-8',
          'bg-light-rail-way-two-9',
          'bg-light-rail-way-two-10',
          'bg-light-rail-way-two-11',
          'bg-light-rail-way-two-12',
          'bg-light-rail-way-two-13',
          'bg-light-rail-way-two-14',
          'bg-light-rail-way-two-15',
        ]}
      />
      <Ramp
        name="color/metro-rail-way-three"
        boxes={[
          'bg-metro-rail-way-three-1',
          'bg-metro-rail-way-three-2',
          'bg-metro-rail-way-three-3',
          'bg-metro-rail-way-three-4',
          'bg-metro-rail-way-three-5',
          'bg-metro-rail-way-three-6',
          'bg-metro-rail-way-three-7',
          'bg-metro-rail-way-three-8',
          'bg-metro-rail-way-three-9',
          'bg-metro-rail-way-three-10',
          'bg-metro-rail-way-three-11',
          'bg-metro-rail-way-three-12',
          'bg-metro-rail-way-three-13',
          'bg-metro-rail-way-three-14',
          'bg-metro-rail-way-three-15',
        ]}
      />
      <Ramp
        name="color/ferry"
        boxes={[
          'bg-ferry-1',
          'bg-ferry-2',
          'bg-ferry-3',
          'bg-ferry-4',
          'bg-ferry-5',
          'bg-ferry-6',
          'bg-ferry-7',
          'bg-ferry-8',
          'bg-ferry-9',
          'bg-ferry-10',
          'bg-ferry-11',
          'bg-ferry-12',
          'bg-ferry-13',
          'bg-ferry-14',
          'bg-ferry-15',
        ]}
      />
    </div>
  ),
};
