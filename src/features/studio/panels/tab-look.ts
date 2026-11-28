/** A route line detail tab's words: Medium 14/20 (4905:28977). */
export const TAB_WORDS = 'px-2 py-1.5 text-sm/5 font-medium whitespace-nowrap';

/** The selected tab in Brand/surface over a 2px line of it; the rest in Text/secondary. */
export const TAB = {
  selected: 'border-b-2 border-brand-surface text-brand-surface',
  rest: 'border-b-2 border-transparent text-text-secondary',
} satisfies Record<'selected' | 'rest', string>;
