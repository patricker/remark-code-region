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
 * - Optionally strips test assertion lines
 * - Auto-dedents (removes common leading whitespace)
 * - Collapses excessive blank lines (3+ → 2)
 * - Trims leading/trailing whitespace
 *
 * @param {string} code - Raw code from region extraction.
 * @param {object} options
 * @param {boolean} options.noStrip - If true, skip assertion stripping.
 * @param {RegExp[]} options.patterns - Assertion patterns to strip.
 * @returns {string} Cleaned code ready for documentation.
 */
export function cleanCode(code, { noStrip = false, patterns = [] } = {}) {
  let result = code;
  if (!noStrip && patterns.length > 0) {
    result = stripAsserts(result, patterns);
  }
  result = dedent(result);
  // Collapse 3+ consecutive blank lines to 2
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}
