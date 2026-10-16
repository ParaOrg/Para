import type { Drawing } from './use-drawing';

interface TapDrawProps {
  draw: Drawing;
}

/**
 * Tap | Draw, after AllTrails' route builder: how the next stretch is drawn.
 * Tap follows the streets, Draw goes straight from point to point. It is the
 * freehand switch the F key flips; a stretch already drawn is turned from the
 * point bar, or with a shift-click.
 */
export function TapDraw({ draw }: TapDrawProps) {
  const option = (straight: boolean, label: string, title: string) => (
    <button
      type="button"
      aria-pressed={draw.freehand === straight}
      onClick={() => draw.setFreehand(straight)}
      title={title}
      className={
        'rounded-full px-4 py-1.5 text-sm font-medium transition-colors ' +
        (draw.freehand === straight
          ? 'bg-neutral-900 text-white'
          : 'text-neutral-600 hover:bg-neutral-100')
      }
    >
      {label}
    </button>
  );
  return (
    <div
      data-testid="tap-draw"
      className="flex rounded-full bg-white p-1 shadow-lg ring-1 ring-black/10"
    >
      {option(false, 'Tap', 'New stretches follow the streets (F)')}
      {option(
        true,
        'Draw',
        'New stretches go straight from point to point, for paths the router refuses (F)',
      )}
    </div>
  );
}
