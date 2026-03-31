/**
 * Strip test assertion lines from code.
 *
 * Test files contain assertions that verify correctness, but documentation
 * readers don't need to see them. This function removes assertion lines
 * and cleans up the resulting whitespace.
 *
 * @param {string} code - The code to clean.
 * @param {RegExp[]} patterns - Patterns matching lines to remove.
 * @returns {string} Cleaned code with assertions removed.
 */
export function stripAsserts(code, patterns) {
  return code
    .split('\n')
    .filter(line => !patterns.some(pat => pat.test(line)))
    .join('\n');
}

/**
 * Clean code for display in documentation.
 *
 * - Optionally strips assertion lines
 * - Collapses excessive blank lines (3+ → 2)
 * - Trims leading/trailing whitespace
 *
 * @param {string} code - Raw code from region extraction.
 * @param {object} options
 * @param {boolean} options.keepAsserts - If true, skip assertion stripping.
 * @param {RegExp[]} options.patterns - Assertion patterns to strip.
 * @returns {string} Cleaned code ready for documentation.
 */
export function cleanCode(code, { keepAsserts = false, patterns = [] } = {}) {
  let result = code;
  if (!keepAsserts) {
    result = stripAsserts(result, patterns);
  }
  // Collapse 3+ consecutive blank lines to 2
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}
