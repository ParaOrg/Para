// A small reader for TypeScript and TSX source, with no dependency: it splits a
// file into tokens and comments, enough to find the modules a file imports and
// exports and the lines that are only comment. It is not a parser. It knows
// strings, template literals (and the code inside their `${}`), regular
// expressions and both comment forms, so a comment or a string that merely
// looks like an import is not one; it does not understand the language beyond
// that.
//
// Known limits, found by reading the source, not by the types:
//   - JSX text is read as code. An apostrophe in it starts a string that ends at
//     the line's end, `{a}/{b}` makes a regular expression that ends there too,
//     and both are harmless as long as no import follows on that line. A
//     backtick in JSX text starts a template that runs to the next backtick and
//     hides what lies between; no source has one, and writing `&#96;` avoids it.
//   - A `/` after `}` or `)` is read as a regular expression after the first and
//     a division after the second, which is right for statements and calls.
//   - parseExports reads `export const { a, b } = x` as exporting nothing, and
//     only reads `export` at the top level of the file.

const WORD = /[\w$]/;
/** After one of these, a `/` starts a regular expression and not a division. */
const REGEX_AFTER = new Set([
  '(',
  ',',
  '=',
  ':',
  '[',
  '!',
  '&',
  '|',
  '?',
  '{',
  '}',
  ';',
  '+',
  '-',
  '*',
  '%',
  '<',
  '>',
  '~',
  '^',
]);
const REGEX_AFTER_WORDS = new Set([
  'return',
  'typeof',
  'case',
  'in',
  'of',
  'void',
  'delete',
  'yield',
]);

/** Index just past the string that opens at `i`; a string ends at its quote or at the line's end. */
function skipString(text, i) {
  const quote = text[i];
  let j = i + 1;
  while (j < text.length && text[j] !== quote && text[j] !== '\n') j += text[j] === '\\' ? 2 : 1;
  return Math.min(j + 1, text.length);
}

/** Index just past the regular expression that opens at `i`; it ends at its `/` or at the line's end. */
function skipRegex(text, i) {
  let inClass = false;
  let j = i + 1;
  while (j < text.length && text[j] !== '\n') {
    if (text[j] === '\\') j++;
    else if (text[j] === '[') inClass = true;
    else if (text[j] === ']') inClass = false;
    else if (text[j] === '/' && !inClass) return j + 1;
    j++;
  }
  return j;
}

/**
 * Reads tokens and comments from `text` starting at `from` into `out`, and returns the
 * index where it stopped: the end of the text, or, with `untilBrace`, just past the `}`
 * that closes the `{` the caller already read. A token is { type: 'word' | 'punct' |
 * 'string' | 'template' | 'regex', value, start }; a string's value is its content, without
 * quotes, and a template with nothing substituted into it is a string. The code inside a
 * template's `${}` is read into the same list, followed by one 'template' token.
 */
function scanFrom(text, from, untilBrace, out) {
  const { tokens, comments } = out;
  let depth = 0;
  let i = from;
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];
    if (/\s/.test(c)) {
      i++;
    } else if (c === '/' && next === '/') {
      let end = text.indexOf('\n', i);
      if (end === -1) end = text.length;
      comments.push({ start: i, end });
      i = end;
    } else if (c === '/' && next === '*') {
      const close = text.indexOf('*/', i + 2);
      const end = close === -1 ? text.length : close + 2;
      comments.push({ start: i, end });
      i = end;
    } else if (c === "'" || c === '"') {
      const end = skipString(text, i);
      const value = text.slice(i + 1, text[end - 1] === c ? end - 1 : end);
      tokens.push({ type: 'string', value, start: i });
      i = end;
    } else if (c === '`') {
      i = scanTemplate(text, i, out);
    } else if (c === '/') {
      const last = tokens.at(-1);
      const startsRegex =
        !last ||
        (last.type === 'punct' && REGEX_AFTER.has(last.value)) ||
        (last.type === 'word' && REGEX_AFTER_WORDS.has(last.value));
      const end = startsRegex ? skipRegex(text, i) : i + 1;
      tokens.push({ type: startsRegex ? 'regex' : 'punct', value: text.slice(i, end), start: i });
      i = end;
    } else if (WORD.test(c)) {
      let end = i + 1;
      while (end < text.length && WORD.test(text[end])) end++;
      tokens.push({ type: 'word', value: text.slice(i, end), start: i });
      i = end;
    } else {
      if (untilBrace && c === '{') depth++;
      if (untilBrace && c === '}' && depth-- === 0) return i + 1;
      tokens.push({ type: 'punct', value: c, start: i });
      i++;
    }
  }
  return i;
}

/** Reads the template literal that opens at `i` into `out`; returns the index just past it. */
function scanTemplate(text, i, out) {
  const { tokens } = out;
  const first = tokens.length;
  let j = i + 1;
  let hasSubstitution = false;
  while (j < text.length && text[j] !== '`') {
    if (text[j] === '\\') {
      j += 2;
    } else if (text[j] === '$' && text[j + 1] === '{') {
      hasSubstitution = true;
      j = scanFrom(text, j + 2, true, out);
    } else {
      j++;
    }
  }
  const end = Math.min(j + 1, text.length);
  if (hasSubstitution) {
    tokens.push({ type: 'template', value: text.slice(i, end), start: i });
  } else {
    tokens.length = first;
    tokens.push({ type: 'string', value: text.slice(i + 1, j), start: i });
  }
  return end;
}

/** The text's tokens and comments (comments as { start, end } in the text). */
export function scanSource(text) {
  const out = { tokens: [], comments: [] };
  scanFrom(text, 0, false, out);
  return out;
}

const isPunct = (token, value) => token?.type === 'punct' && token.value === value;
const isWord = (token, value) => token?.type === 'word' && token.value === value;

/** Index of the `}` that closes the `{` at `open`, or -1. */
function closingBrace(tokens, open) {
  for (let i = open + 1; i < tokens.length; i++) {
    if (isPunct(tokens[i], '}')) return i;
  }
  return -1;
}

/** Whether tokens[i], an `import` followed by `(` and a string, is in a type: `typeof import('x')`, `import('x').T`. */
function isTypeImport(tokens, i) {
  const afterCall = tokens[i + 4];
  const isQualified =
    isPunct(afterCall, '.') && tokens[i + 5]?.type === 'word' && !isPunct(tokens[i + 6], '(');
  return isWord(tokens[i - 1], 'typeof') || isQualified;
}

/**
 * Every module a source text imports or re-exports, as { specifier, isDynamic }:
 * `import … from`, `export … from`, `import 'x'` and `import('x')`. Type-only forms
 * count, as they do for the page; an `import('x')` in a type is static.
 */
export function parseImports(text) {
  const { tokens } = scanSource(text);
  const found = [];
  tokens.forEach((token, i) => {
    if (isWord(token, 'import') && !isPunct(tokens[i - 1], '.')) {
      const next = tokens[i + 1];
      if (next?.type === 'string') {
        found.push({ specifier: next.value, isDynamic: false });
      } else if (isPunct(next, '(') && tokens[i + 2]?.type === 'string') {
        found.push({ specifier: tokens[i + 2].value, isDynamic: !isTypeImport(tokens, i) });
      } else if (!isPunct(next, '.') && !isPunct(next, '(')) {
        // import a, { b as c } from 'x' / import * as d from 'x' / import type { E } from 'x'
        let j = i + 1;
        while (
          j < tokens.length &&
          !(isWord(tokens[j], 'from') && tokens[j + 1]?.type === 'string')
        ) {
          const t = tokens[j];
          if (isPunct(t, '{')) j = closingBrace(tokens, j);
          else if (!(t.type === 'word' || isPunct(t, ',') || isPunct(t, '*'))) return;
          if (j === -1) return;
          j++;
        }
        if (j < tokens.length) found.push({ specifier: tokens[j + 1].value, isDynamic: false });
      }
    } else if (isWord(token, 'export')) {
      let j = i + 1;
      if (isWord(tokens[j], 'type')) j++;
      if (isPunct(tokens[j], '{')) j = closingBrace(tokens, j);
      else if (isPunct(tokens[j], '*')) {
        while (j < tokens.length && !isWord(tokens[j], 'from') && !isPunct(tokens[j], ';')) j++;
        j--;
      } else return;
      if (isWord(tokens[j + 1], 'from') && tokens[j + 2]?.type === 'string') {
        found.push({ specifier: tokens[j + 2].value, isDynamic: false });
      }
    }
  });
  return found;
}

const DECLARATION_WORDS = new Set([
  'function',
  'const',
  'let',
  'var',
  'class',
  'interface',
  'type',
  'enum',
]);
const MODIFIER_WORDS = new Set(['async', 'declare', 'abstract']);
/** Words that start the next statement, so a declaration's initializer ends before them. */
const STATEMENT_WORDS = new Set(['export', 'import', 'interface', 'enum', 'declare']);

/** The names `const a = 1, b = [2, 3]` declares, given the index of the first name. */
function declaratorNames(tokens, first) {
  const names = [];
  let depth = 0;
  let expectName = true;
  for (let i = first; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === 'punct' && '([{'.includes(t.value)) depth++;
    else if (t.type === 'punct' && ')]}'.includes(t.value)) depth--;
    else if (
      depth === 0 &&
      (isPunct(t, ';') || (t.type === 'word' && STATEMENT_WORDS.has(t.value)))
    )
      break;
    else if (depth === 0 && isPunct(t, ',')) {
      expectName = true;
      continue;
    }
    if (expectName && depth === 0 && t.type === 'word') names.push(t.value);
    expectName = false;
  }
  return names;
}

/**
 * The names an index.ts exports at its top level; `export *` is listed as
 * '* from <path>'. Reads `export { a, b as c }`, `export type { T }`, and
 * `export` before function, const/let/var (every declarator), class, interface,
 * type and enum, with `async`, `declare`, `abstract` and `const enum`.
 */
export function parseExports(text) {
  const { tokens } = scanSource(text);
  const names = [];
  let depth = 0;
  tokens.forEach((token, i) => {
    if (isPunct(token, '{')) depth++;
    if (isPunct(token, '}')) depth--;
    if (!isWord(token, 'export') || depth !== 0) return;
    let j = i + 1;
    if (isWord(tokens[j], 'type') && (isPunct(tokens[j + 1], '{') || isPunct(tokens[j + 1], '*')))
      j++;
    if (isPunct(tokens[j], '{')) {
      const close = closingBrace(tokens, j);
      // each element is `name`, `name as other` or `type name`: the exported name is the last word
      let element = [];
      for (j += 1; j <= close; j++) {
        if (isPunct(tokens[j], ',') || j === close) {
          const last = element.filter((t) => t.type === 'word').at(-1);
          if (last) names.push(last.value);
          element = [];
        } else {
          element.push(tokens[j]);
        }
      }
    } else if (isPunct(tokens[j], '*')) {
      while (j < tokens.length && !isWord(tokens[j], 'from')) j++;
      if (tokens[j + 1]?.type === 'string') names.push(`* from ${tokens[j + 1].value}`);
    } else {
      while (MODIFIER_WORDS.has(tokens[j]?.value)) j++;
      if (isWord(tokens[j], 'const') && isWord(tokens[j + 1], 'enum')) j++;
      if (!DECLARATION_WORDS.has(tokens[j]?.value)) return;
      const keyword = tokens[j].value;
      if (isWord(tokens[j], 'function') && isPunct(tokens[j + 1], '*')) j++;
      if (['const', 'let', 'var'].includes(keyword)) names.push(...declaratorNames(tokens, j + 1));
      else if (tokens[j + 1]?.type === 'word') names.push(tokens[j + 1].value);
    }
  });
  return names;
}

/** The CSS text's `@import 'x'` and `@import url('x')`, as { specifier, isDynamic }. */
export function parseCssImports(text) {
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...stripped.matchAll(/@import\s+(?:url\(\s*)?['"]([^'"]+)['"]/g)].map((m) => ({
    specifier: m[1],
    isDynamic: false,
  }));
}

/** The text with every comment blanked out (newlines kept), so a line left empty was all comment. */
export function withoutComments(text) {
  let result = '';
  let cursor = 0;
  const comments = [...scanSource(text).comments].sort((a, b) => a.start - b.start);
  for (const { start, end } of comments) {
    result += text.slice(cursor, start) + text.slice(start, end).replace(/[^\n]/g, ' ');
    cursor = end;
  }
  return result + text.slice(cursor);
}
