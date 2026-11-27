import type { ReactNode } from 'react';

import { Button } from '@/design-system/primitives/button';

interface StartPickerFrameProps {
  /** The panel's heading and its region's name: "Start from an OSM route". */
  title: string;
  children: ReactNode;
  onClose: () => void;
}

/**
 * The panel a "start from" picker stands in, where an upload's hint stands, marked as the
 * placeholder it is (.scratch/studio-ux/owner-to-design-later.md). The OSM and old Para pickers
 * share it.
 */
export function StartPickerFrame({ title, children, onClose }: StartPickerFrameProps) {
  return (
    <section
      aria-label={title}
      className="absolute top-[calc(1rem+var(--map-safe-top))] left-4 z-10 flex max-h-[calc(100%-2rem)] w-80 max-w-[calc(100%-2rem)] flex-col gap-3 overflow-y-auto rounded-2xl bg-surface p-4 text-sm text-content-secondary shadow-lg ring-1 ring-content-primary/10"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-content-primary">{title}</h2>
        <span className="text-xs text-content-tertiary">Placeholder look</span>
      </div>
      {children}
      <Button variant="secondary" label="Close" onClick={onClose} />
    </section>
  );
}
