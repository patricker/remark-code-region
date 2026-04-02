/**
 * Extract a named region from file content.
 *
 * Tries each marker pair in order until one matches. Detects unclosed regions.
 *
 * @param {string} content - Full file content.
 * @param {string} regionName - Name of the region to extract.
 * @param {string} filePath - File path (for error messages).
 * @param {Array<{start: RegExp, end: RegExp}>} markers - Region marker pairs to try.
 * @returns {string} The content between the region markers.
 * @throws {Error} If the region is not found or not closed.
 */
export function extractRegion(content, regionName, filePath, markers) {
  const lines = content.split('\n');
  let capturing = false;
  const captured = [];
  let found = false;

  for (const line of lines) {
    let isStart = false;
    let isEnd = false;

    for (const { start, end } of markers) {
      const startMatch = line.match(start);
      if (startMatch && startMatch[1] === regionName) {
        isStart = true;
        break;
      }
      const endMatch = line.match(end);
      if (endMatch && endMatch[1] === regionName) {
        isEnd = true;
        break;
      }
    }

    if (isStart) {
      capturing = true;
      found = true;
      continue;
    }
    if (isEnd) {
      capturing = false;
      continue;
    }
    if (capturing) {
      captured.push(line);
    }
  }

  if (!found) {
    throw new Error(
      `remark-code-region: region '${regionName}' not found in ${filePath}`,
    );
  }

  if (found && capturing) {
    throw new Error(
      `remark-code-region: region '${regionName}' in ${filePath} was opened but never closed`,
    );
  }

  return captured.join('\n');
}
