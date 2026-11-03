/**
 * A CSS duration in milliseconds: `390ms` as tokens.css writes it, or `.39s` as a build's
 * minified CSS writes the same token. Null for a value that does not read as a duration.
 */
export function cssDurationMs(value: string): number | null {
  const match = /^\s*(\d*\.?\d+)(m?)s\s*$/.exec(value);
  return match ? Number(match[1]) * (match[2] ? 1 : 1000) : null;
}
