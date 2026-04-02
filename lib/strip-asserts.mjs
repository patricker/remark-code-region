/**
 * Strip test assertion lines, transmute assertions to output comments,
 * and auto-dedent extracted code.
 */

import { COMMENT_PREFIX } from './patterns.mjs';

/**
 * Strip lines matching any of the given patterns.
 *
 * @param {string} code - The code to filter.
 * @param {RegExp[]} patterns - Patterns matching lines to remove.
 * @returns {string} Code with matching lines removed.
 */
export function stripAsserts(code, patterns) {
  return code
    .split('\n')
    .filter((line) => !patterns.some((pat) => pat.test(line)))
    .join('\n');
}

/**
 * Split a string at top-level commas, respecting nested parens/brackets/braces
 * and string literals (double quotes, single quotes, backticks).
 *
 * @param {string} str - The arguments string (without outer delimiters).
 * @returns {string[]} Array of trimmed argument strings.
 */
export function splitArgs(str) {
  const args = [];
  let current = '';
  let depth = 0;
  let quote = '';

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (quote && ch === '\\') {
      current += ch + (str[i + 1] || '');
      i++;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      if (!quote) quote = ch;
      else if (quote === ch) quote = '';
      current += ch;
      continue;
    }

    if (quote) {
      current += ch;
      continue;
    }

    if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
      current += ch;
      continue;
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      current += ch;
      continue;
    }

    if (ch === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) args.push(current.trim());
  return args;
}

/**
 * Transform assertion lines into readable expected-output comments.
 *
 * When a rule has an `argMap` property, the regex captures the full inner
 * content as a single group, and `splitArgs` splits it at top-level commas.
 * The argMap maps named groups to argument indices.
 *
 * @param {string} code - The code to transform.
 * @param {Array<{match: RegExp, template: string, argMap?: Record<string, number>}>} rules - Transmutation rules.
 * @param {string} lang - Code fence language tag (for $COMMENT resolution).
 * @returns {string} Code with matched assertion lines replaced by comments. Non-matching lines pass through unchanged.
 */
export function transmuteAsserts(code, rules, lang) {
  const commentChar = COMMENT_PREFIX[lang?.toLowerCase()] || '//';
  return code
    .split('\n')
    .map((line) => {
      for (const rule of rules) {
        const m = line.match(rule.match);
        if (m) {
          const indent = line.match(/^(\s*)/)[1];

          // Build groups — either from regex named groups or argMap + splitArgs
          let groups = m.groups || {};
          if (rule.argMap && groups.inner) {
            const args = splitArgs(groups.inner);
            groups = {};
            for (const [name, idx] of Object.entries(rule.argMap)) {
              groups[name] = args[idx] ?? '';
            }
          }

          const result = rule.template
            .replace('$COMMENT', commentChar)
            .replace(/\$<(\w+)>/g, (_, name) => groups[name] ?? '');
          return indent + result;
        }
      }
      return line;
    })
    .join('\n');
}

/**
 * Remove the common leading whitespace from all lines.
 * Preserves relative indentation between lines.
 *
 * @param {string} code - The code to dedent.
 * @returns {string} Dedented code.
 */
export function dedent(code) {
  const lines = code.split('\n');
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return code;
  const minIndent = Math.min(
    ...nonEmpty.map((l) => l.match(/^(\s*)/)[1].length),
  );
  if (minIndent === 0) return code;
  return lines
    .map((l) => (l.length >= minIndent ? l.slice(minIndent) : l))
    .join('\n');
}

/**
 * Clean code for display in documentation.
 *
 * Runs a configurable pipeline of cleaning steps:
 *   1. Strip assertion lines (controlled by noStrip + patterns)
 *   2. Steps from the `clean` array, in order:
 *      - 'dedent'   — remove common leading whitespace
 *      - 'collapse' — collapse 3+ consecutive blank lines to 2
 *      - 'trim'     — trim leading and trailing whitespace
 *      - 'trimEnd'  — trim trailing whitespace only
 *
 * @param {string} code - Raw code from region extraction.
 * @param {object} options
 * @param {boolean} options.noStrip - If true, skip assertion stripping.
 * @param {RegExp[]} options.patterns - Assertion patterns to strip.
 * @param {string[]} options.clean - Cleaning steps to run (default: ['dedent', 'collapse', 'trim']).
 * @returns {string} Cleaned code ready for documentation.
 */
export function cleanCode(
  code,
  {
    noStrip = false,
    noTransmute = false,
    patterns = [],
    transmuteRules = [],
    lang = '',
    clean = ['dedent', 'collapse', 'trim'],
  } = {},
) {
  let result = code;
  // Transmute runs first — matched lines become comments and skip strip
  if (!noTransmute && transmuteRules.length > 0) {
    result = transmuteAsserts(result, transmuteRules, lang);
  }
  if (!noStrip && patterns.length > 0) {
    result = stripAsserts(result, patterns);
  }
  for (const step of clean) {
    switch (step) {
      case 'dedent':
        result = dedent(result);
        break;
      case 'collapse':
        result = result.replace(/\n{3,}/g, '\n\n');
        break;
      case 'trim':
        result = result.trim();
        break;
      case 'trimEnd':
        result = result.trimEnd();
        break;
    }
  }
  return result;
}
