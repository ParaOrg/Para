/**
 * Cloudflare's `_headers` file, read the way its static assets read it: a
 * path pattern on a line of its own, its headers indented under it. Every
 * rule that matches a path adds its headers; a header two rules both set is
 * sent once, their values joined with a comma; `! Name` in a rule takes the
 * header back out of what the rules before it set. Used by the preview
 * server (preview-policies.ts) and the build guard (content-policy.mjs), so
 * both see the headers the site will send.
 */
export interface HeaderRule {
  /** The pattern as written: `/*`, `/studio/*`, `/`. */
  pattern: string;
  /** Header names, lower-cased, with the values this rule sets. */
  sets: Record<string, string[]>;
  /** Header names, lower-cased, this rule takes back out. */
  detaches: string[];
}

export function parseHeadersFile(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      rules.push({ pattern: trimmed, sets: {}, detaches: [] });
      continue;
    }
    const rule = rules.at(-1);
    if (!rule) continue;
    if (trimmed.startsWith('! ')) {
      rule.detaches.push(trimmed.slice(2).trim().toLowerCase());
      continue;
    }
    const colon = trimmed.indexOf(':');
    if (colon <= 0) continue;
    const name = trimmed.slice(0, colon).trim().toLowerCase();
    (rule.sets[name] ??= []).push(trimmed.slice(colon + 1).trim());
  }
  return rules;
}

/** Whether a rule's pattern matches a path: `*` is anything, `:name` anything but a slash. */
export function ruleMatches(rule: HeaderRule, pathname: string): boolean {
  // A pattern with a host is for one address of the site; a path alone cannot answer it.
  if (!rule.pattern.startsWith('/')) return false;
  const source = rule.pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/:[A-Za-z]\w*/g, '[^/]+');
  return new RegExp(`^${source}$`).test(pathname);
}

/** The headers a path is sent, names lower-cased: every matching rule's, in the file's order. */
export function headersFor(rules: readonly HeaderRule[], pathname: string): Record<string, string> {
  const values = new Map<string, string[]>();
  for (const rule of rules) {
    if (!ruleMatches(rule, pathname)) continue;
    for (const name of rule.detaches) values.delete(name);
    for (const [name, set] of Object.entries(rule.sets))
      values.set(name, [...(values.get(name) ?? []), ...set]);
  }
  return Object.fromEntries([...values].map(([name, set]) => [name, set.join(', ')]));
}
