interface TimelineDotProps {
  /** The rail's colour classes: the ring, and the Selected one's centre. */
  rail: string;
  selected?: boolean;
  /** 2px into the rail after it, as the card lays it; false where there is no rail (the map). */
  isTucked?: boolean;
}

/**
 * Figma's TimelineDot: Content/inverse ringed in the rail's colour. It sits
 * 2px into the rail after it, as the TimelineStick's -2px gap lays them.
 * Selected, the white grows and the ring thins to 2px round it, with a 12px
 * centre in the rail's colour again — the card's own (3778:3183): 24 across
 * either way, so nothing moves. The map's hintuans and ride ends wear it too
 * (HintuanLabel, EndTitles), untucked: with no rail there, `isTucked` false
 * keeps its box its own 24.
 */
export function TimelineDot({ rail, selected = false, isTucked = true }: TimelineDotProps) {
  const tuck = isTucked ? '-mb-0.5 ' : '';
  return selected ? (
    <span className={tuck + 'flex shrink-0 rounded-full p-0.5 ' + rail}>
      <span className="grid size-5 place-items-center rounded-full bg-content-inverse">
        <span className={'size-3 rounded-full ' + rail} />
      </span>
    </span>
  ) : (
    <span className={tuck + 'flex shrink-0 rounded-full p-1.5 ' + rail}>
      <span className="size-3 rounded-full bg-content-inverse" />
    </span>
  );
}
