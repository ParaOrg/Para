// A small reader for TypeScript and TSX source, with no dependency: it splits a
// file into tokens and comments, enough to find the modules a file imports and
// exports and the lines that are only comment. It is not a parser. It knows
// strings, template literals, regular expressions and both comment forms, so a
// comment or a string that merely looks like an import is not one; it does not
// understand the language beyond that.
//
// Known limits, none of which the source has today: an `import()` inside a
// template literal's `${}` is not seen, and a JSX text with an apostrophe is
// read as the start of a string that ends at the line's end.

const WORD = /[\w$]/;
/** After one of these, a `/` starts a regular expression and not a division. */
const REGEX_AFTER = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-']);
const REGEX_AFTER_WORDS = new Set(['return', 'typeof', 'case', 'in', 'of', 'void', 'delete']);

/** Index just past the string that opens at `i`; a string ends at its quote or at the line's end. */
function skipString(text, i) {
  const quote = text[i];
  let j = i + 1;
  while (j < text.length && text[j] !== quote && text[j] !== '\n') j += text[j] === '\\' ? 2 : 1;
  return Math.min(j + 1, text.length);
}

/** Index just past the `}` that closes the `${` whose `{` is at `i`, strings and templates inside skipped. */
function skipBraces(text, i) {
  let depth = 0;
  let j = i;
  while (j < text.length) {
    const c = text[j];
    if (c === "'" || c === '"') j = skipString(text, j);
    else if (c === '`') j = skipTemplate(text, j);
    else {
      if (c === '{') depth++;
      if (c === '}' && --depth === 0) return j + 1;
      j++;
    }
  }
  return j;
}

/** Index just past the template literal that opens at `i`. */
function skipTemplate(text, i) {
  let j = i + 1;
  while (j < text.length && text[j] !== '`') {
    if (text[j] === '\\') j += 2;
    else if (text[j] === '$' && text[j + 1] === '{') j = skipBraces(text, j + 1);
    else j++;
  }
  return Math.min(j + 1, text.length);
}

/** Index just past the regular expression that opens at `i`. */
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
 * The text's tokens and comments. A token is { type: 'word' | 'punct' | 'string' |
 * 'template' | 'regex', value } (a string's value is its content, without quotes);
 * a comment is { start, end } in the text.
 */
export function scanSource(text) {
  const tokens = [];
  const comments = [];
  let i = 0;
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
      tokens.push({
        type: 'string',
        value: text.slice(i + 1, text[end - 1] === c ? end - 1 : end),
      });
      i = end;
    } else if (c === '`') {
      const end = skipTemplate(text, i);
      tokens.push({ type: 'template', value: text.slice(i, end) });
      i = end;
    } else if (c === '/') {
      const last = tokens.at(-1);
      const startsRegex =
        !last ||
        (last.type === 'punct' && REGEX_AFTER.has(last.value)) ||
        (last.type === 'word' && REGEX_AFTER_WORDS.has(last.value));
      const end = startsRegex ? skipRegex(text, i) : i + 1;
      tokens.push({ type: startsRegex ? 'regex' : 'punct', value: text.slice(i, end) });
      i = end;
    } else if (WORD.test(c)) {
      let end = i + 1;
      while (end < text.length && WORD.test(text[end])) end++;
      tokens.push({ type: 'word', value: text.slice(i, end) });
      i = end;
    } else {
      tokens.push({ type: 'punct', value: c });
      i++;
    }
  }
  return { tokens, comments };
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

/**
 * Every module a source text imports or re-exports, as { specifier, isDynamic }:
 * `import … from`, `export … from`, `import 'x'` and `import('x')`. Type-only forms
 * count, as they do for the page.
 */
export function parseImports(text) {
  const { tokens } = scanSource(text);
  const found = [];
  tokens.forEach((token, i) => {
    if (isWord(token, 'import')) {
      const next = tokens[i + 1];
      if (next?.type === 'string') {
        found.push({ specifier: next.value, isDynamic: false });
      } else if (isPunct(next, '(') && tokens[i + 2]?.type === 'string') {
        found.push({ specifier: tokens[i + 2].value, isDynamic: true });
      } else if (!isPunct(next, '.') && !isPunct(next, '(')) {
        // import a, { b as c } from 'x' / import * as d from 'x' / import type { E } from 'x'
        let j = i + 1;
        while (j < tokens.length && !isWord(tokens[j], 'from')) {
          const t = tokens[j];
          const isClause = t.type === 'word' || (t.type === 'punct' && ',{}*'.includes(t.value));
          if (!isClause) return;
          j++;
        }
        if (tokens[j + 1]?.type === 'string') {
          found.push({ specifier: tokens[j + 1].value, isDynamic: false });
        }
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

/** The names an index.ts exports; `export *` is listed as '* from <path>'. */
export function parseExports(text) {
  const { tokens } = scanSource(text);
  const names = [];
  const DECLARATIONS = new Set([
    'function',
    'const',
    'let',
    'var',
    'class',
    'interface',
    'type',
    'enum',
  ]);
  tokens.forEach((token, i) => {
    if (!isWord(token, 'export')) return;
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
      if (isWord(tokens[j], 'async')) j++;
      if (isWord(tokens[j], 'default') || !DECLARATIONS.has(tokens[j]?.value)) return;
      if (isWord(tokens[j], 'function') && isPunct(tokens[j + 1], '*')) j++;
      if (tokens[j + 1]?.type === 'word') names.push(tokens[j + 1].value);
    }
  });
  return names;
}

/** The CSS text's `@import 'x'` and `@import url('x')`, as { specifier, isDynamic }. */
export function parseCssImports(text) {
  const withoutComments = text.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...withoutComments.matchAll(/@import\s+(?:url\(\s*)?['"]([^'"]+)['"]/g)].map((m) => ({
    specifier: m[1],
    isDynamic: false,
  }));
}

/** The text with every comment blanked out (newlines kept), so a line left empty was all comment. */
export function withoutComments(text) {
  let result = '';
  let cursor = 0;
  for (const { start, end } of scanSource(text).comments) {
    result += text.slice(cursor, start) + text.slice(start, end).replace(/[^\n]/g, ' ');
    cursor = end;
  }
  return result + text.slice(cursor);
}
