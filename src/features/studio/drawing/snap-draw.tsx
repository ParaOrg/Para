import type { ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';

import { DrawIcon, MoveIcon, SnapIcon } from './draw-toolbar-icons';
import type { Drawing } from './use-drawing';

interface SnapDrawProps {
  draw: Drawing;
}

/** The three tools: Move selects and drags, Snap and Draw add points. */
type Tool = 'move' | 'snap' | 'draw';

/**
 * Move | Snap | Draw, the owner's toolbar (4300:20893): what a click on the
 * map does. Move selects and drags points, handles and the line, and never
 * adds a point; a saved line opened to edit starts in it. Snap adds points
 * whose stretches follow the streets, Draw ones that go straight from point
 * to point. V, S and D pick them, F flips Snap and Draw; a stretch already
 * drawn is turned from the point bar, or with a shift-click. Sits in the
 * toolbar's pill beside Done, so it draws no pill of its own.
 */
export function SnapDraw({ draw }: SnapDrawProps) {
  const picked: Tool = draw.moving ? 'move' : draw.freehand ? 'draw' : 'snap';
  const pick: Record<Tool, () => void> = {
    move: () => draw.setMoving(true),
    snap: () => draw.setFreehand(false),
    draw: () => draw.setFreehand(true),
  };
  const option = (tool: Tool, label: string, title: string, icon: ReactNode) => {
    const isPicked = picked === tool;
    return (
      <button
        type="button"
        aria-pressed={isPicked}
        onClick={pick[tool]}
        title={title}
        className={cn(
          'flex items-center gap-1.5 rounded-full py-1.5 pr-3.5 pl-2.5 text-sm font-medium transition-colors',
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
    <div data-testid="snap-draw" role="group" aria-label="Tool" className="flex gap-0.5">
      {option('move', 'Move', 'Select and drag points, handles and the line (V)', <MoveIcon />)}
      {option('snap', 'Snap', 'New stretches follow the streets (S)', <SnapIcon />)}
      {option(
        'draw',
        'Draw',
        'New stretches go straight from point to point, for paths the router refuses (D)',
        <DrawIcon />,
      )}
    </div>
  );
}
