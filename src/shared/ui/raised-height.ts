/**
 * How tall `content` is drawn raised: as it is now, and in full every line it cuts short at Low,
 * which carries `data-cut-at-low` (a RouteCard's place name). A fitted sheet measures this, so a
 * short list can still rise far enough to show it.
 */
export function raisedHeightOf(content: HTMLElement): number {
  let px = content.offsetHeight;
  for (const cut of content.querySelectorAll('[data-cut-at-low]')) {
    const hidden = cut.scrollHeight - cut.clientHeight;
    // Whole lines only (a RouteCard's are 32 px): one drawn whole overflows by a descender's few.
    if (hidden > 8) px += hidden;
  }
  return px;
}
