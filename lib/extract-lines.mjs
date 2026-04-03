/**
 * Extract a range of lines from file content.
 *
 * @param {string} content - Full file content.
 * @param {string} lineSpec - Line specification: "L3", "L3-L6", "L3-" (1-based, inclusive).
 * @param {string} filePath - File path (for error messages).
 * @returns {string} The extracted lines joined by newlines.
 * @throws {Error} If the line specification is out of range or reversed.
 */

export const LINE_RANGE_RE = /^L(\d+)(?:-(?:L?(\d+))?)?$/;

export function extractLines(content, lineSpec, filePath) {
  const m = lineSpec.match(LINE_RANGE_RE);
  if (!m) {
    throw new Error(
      `remark-code-region: invalid line range '${lineSpec}' in ${filePath}`,
    );
  }

  const lines = content.split('\n');
  const total = lines.length;
  const start = parseInt(m[1], 10);
  // m[2] is the end number if present; if dash with no end (L3-), use total
  const end =
    m[2] != null ? parseInt(m[2], 10) : m[0].includes('-') ? total : start;

  if (start < 1 || start > total) {
    throw new Error(
      `remark-code-region: line ${start} is out of range (${filePath} has ${total} lines)`,
    );
  }
  if (end > total) {
    throw new Error(
      `remark-code-region: line ${end} is out of range (${filePath} has ${total} lines)`,
    );
  }
  if (end < start) {
    throw new Error(
      `remark-code-region: start line ${start} is after end line ${end} in ${filePath}`,
    );
  }

  return lines.slice(start - 1, end).join('\n');
}
