import type { ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';

import { DrawIcon, SnapIcon } from './draw-toolbar-icons';
import type { Drawing } from './use-drawing';

interface SnapDrawProps {
  draw: Drawing;
}

/**
 * Snap | Draw, the owner's toolbar (4304:21645): how the next stretch is
 * drawn. Snap follows the streets, Draw goes straight from point to point. It
 * is the freehand switch the F key flips; a stretch already drawn is turned
 * from the point bar, or with a shift-click. Sits in the toolbar's pill
 * beside Done, so it draws no pill of its own.
 */
export function SnapDraw({ draw }: SnapDrawProps) {
  const option = (isStraight: boolean, label: string, title: string, icon: ReactNode) => {
    const isPicked = draw.freehand === isStraight;
    return (
      <button
        type="button"
        aria-pressed={isPicked}
        onClick={() => draw.setFreehand(isStraight)}
        title={title}
        className={cn(
          'flex items-center gap-1.5 rounded-full py-1.5 pr-3.5 pl-2.5 text-sm font-medium transition-colors [&>svg]:size-5',
          isPicked
            ? 'bg-parabrand-100 text-parabrand-800'
            : 'text-content-primary hover:bg-surface-secondary',
        )}
      >
        {icon}
        {label}
      </button>
    );
  };
  return (
    <div data-testid="snap-draw" role="group" aria-label="New stretches" className="flex gap-0.5">
      {option(false, 'Snap', 'New stretches follow the streets (S)', <SnapIcon />)}
      {option(
        true,
        'Draw',
        'New stretches go straight from point to point, for paths the router refuses (D)',
        <DrawIcon />,
      )}
    </div>
  );
}
