/**
 * Strip test assertion lines and auto-dedent extracted code.
 */

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
    .filter(line => !patterns.some(pat => pat.test(line)))
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
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length === 0) return code;
  const minIndent = Math.min(...nonEmpty.map(l => l.match(/^(\s*)/)[1].length));
  if (minIndent === 0) return code;
  return lines.map(l => l.length >= minIndent ? l.slice(minIndent) : l).join('\n');
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
export function cleanCode(code, { noStrip = false, patterns = [], clean = ['dedent', 'collapse', 'trim'] } = {}) {
  let result = code;
  if (!noStrip && patterns.length > 0) {
    result = stripAsserts(result, patterns);
  }
  for (const step of clean) {
    switch (step) {
      case 'dedent':   result = dedent(result); break;
      case 'collapse': result = result.replace(/\n{3,}/g, '\n\n'); break;
      case 'trim':     result = result.trim(); break;
      case 'trimEnd':  result = result.trimEnd(); break;
    }
  }
  return result;
}
