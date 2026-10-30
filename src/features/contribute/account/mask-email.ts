const STAR = '*';

/**
 * The email a code went to, as the code step shows it: enough to recognise, not enough to read
 * out. The part before @ keeps its first 4 characters and its last, with a star for each one
 * between (villanueva2@gmail.com → vill******2@gmail.com). A part shorter than 8 keeps only its
 * first and last, so at least a third of it is hidden; 2 keep the first alone, and 1 shows none. The
 * domain is shown whole. Text with no @ is masked the same way, as a whole.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  const name = at < 0 ? email : email.slice(0, at);
  const domain = at < 0 ? '' : email.slice(at);
  return maskName(name) + domain;
}

function maskName(name: string): string {
  if (name.length === 0) return name;
  if (name.length === 1) return STAR;
  if (name.length === 2) return name[0] + STAR;
  const shown = name.length >= 8 ? 4 : 1;
  return name.slice(0, shown) + STAR.repeat(name.length - shown - 1) + name.slice(-1);
}
