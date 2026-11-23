/**
 * How tall `content` is drawn raised: as it is now, and in full every line it cuts short at Low,
 * which carries `data-cut-at-low` (a RouteCard's place name). A fitted sheet measures this, so a
 * short list can still rise far enough to show it.
 */
export function raisedHeightOf(content: HTMLElement): number {
  let px = content.offsetHeight;
  for (const cut of content.querySelectorAll<HTMLElement>('[data-cut-at-low]'))
    px += cut.scrollHeight - cut.clientHeight;
  return px;
}
