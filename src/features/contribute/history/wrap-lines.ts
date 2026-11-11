/**
 * Text broken into lines no wider than `width`, at most `max` of them, the last cut short with an
 * ellipsis when the words run on. `measure` is the canvas's measureText width, passed in so the
 * breaking can be tested without a canvas.
 */
export function wrapLines(
  text: string,
  width: number,
  max: number,
  measure: (line: string) => number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next) <= width || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  let last = kept[max - 1];
  while (last && measure(`${last}…`) > width) last = last.slice(0, -1).trimEnd();
  kept[max - 1] = `${last}…`;
  return kept;
}
