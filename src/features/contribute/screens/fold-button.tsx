import { IconButton } from '@/design-system/primitives/icon-button';
import { ChevronDownIcon } from '@/shared/ui/route-icons';

interface FoldButtonProps {
  isFolded: boolean;
  /** The id of what it folds away: the recording card. */
  controls: string;
  onFoldedChange: (isFolded: boolean) => void;
}

/**
 * The chevron that folds the recording card away and brings it back (Figma 4496:10784 and
 * 4496:10906): a Special Large IconButton at the left, level with the right-hand column's foot,
 * which stands 16 (--dock-gap) over the stack. It slides with the column as the card folds.
 */
export function FoldButton({ isFolded, controls, onFoldedChange }: FoldButtonProps) {
  return (
    <div className="absolute bottom-0 left-5 z-10 flex -translate-y-[calc(var(--stack-room,0px)+var(--dock-gap,1rem))] transition-[translate] duration-sheet ease-enter motion-reduce:transition-none">
      <IconButton
        tooltip="right"
        size="large"
        label={isFolded ? 'Show the recording card' : 'Hide the recording card'}
        icon={isFolded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        aria-expanded={!isFolded}
        aria-controls={controls}
        onClick={() => onFoldedChange(!isFolded)}
      />
    </div>
  );
}

/** chevron-up: the chevron-down turned over, to bring the card back. */
function ChevronUpIcon() {
  return (
    <span className="block size-full rotate-180 *:size-full">
      <ChevronDownIcon />
    </span>
  );
}
