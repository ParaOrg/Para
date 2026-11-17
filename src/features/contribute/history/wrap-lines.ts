/**
 * Text broken into lines no wider than `width`, at most `max` of them. A line is cut short with an
 * ellipsis when the words run on past the last one, or when it is one word wider than the card.
 * `measure` is the canvas's measureText width, passed in so the breaking can be tested without a
 * canvas.
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
  return lines.slice(0, max).map((kept, index) => {
    const runsOn = index === max - 1 && lines.length > max;
    return runsOn || measure(kept) > width ? cut(kept, width, measure) : kept;
  });
}

/** The line with characters taken off its end until it fits with an ellipsis after it. */
function cut(line: string, width: number, measure: (line: string) => number): string {
  let kept = line;
  // Spread by code point, so an emoji is dropped whole and never left as half a pair.
  while (kept && measure(`${kept}…`) > width) kept = [...kept].slice(0, -1).join('').trimEnd();
  return `${kept}…`;
}
