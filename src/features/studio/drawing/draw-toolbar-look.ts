/**
 * The drawing toolbar's white pills, after the owner's frame (4304:21645): the
 * contributor page's toolbar pill (bottom-toolbar.tsx), the same white on shadow-large.
 */
export const PILL = 'flex items-center gap-0.5 rounded-full bg-surface p-1 shadow-large';

/**
 * A worded tool button, the same size under a finger as under a mouse: touch
 * targets have no 44 px floor (they follow Figma). Its words' colour is the
 * caller's, so two colours never fight over one button.
 */
export const TOOL =
  'rounded-full px-3 py-1.5 text-sm hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40';

/** Undo's and Redo's round buttons, an icon each. */
export const ICON_TOOL =
  'flex size-9 items-center justify-center rounded-full text-content-primary hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:size-5';
