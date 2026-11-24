import 'react';

declare module 'react' {
  /**
   * React's style type lists CSS's own properties only; a component also sets custom ones
   * (`--sheet-y`) for its stylesheet to read.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging: React's CSSProperties gains CSS custom-property keys
  interface CSSProperties extends Partial<Record<`--${string}`, string | number>> {}
}
