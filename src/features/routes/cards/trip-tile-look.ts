/* A trip's tiles' look (BottomContent, 4821:40538), shared by the plain tile and the fare's. */

export const TILE = 'flex min-w-0 flex-1 basis-0 flex-col items-center gap-0.5 overflow-clip';
export const FIGURE = 'w-full text-lg/6.5 font-semibold text-text-primary';
export const NAME = 'text-xs/4 text-text-tertiary';
// Figma draws no hover or pressed state for the fare's button; bg/fill/fill-secondary stands in
// until the owner draws one.
export const PRESSABLE =
  'transition-colors duration-quick ease-move hover:bg-bg-fill-secondary active:bg-bg-fill-secondary';
