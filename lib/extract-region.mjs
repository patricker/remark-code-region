/**
 * Extract a named region from file content.
 *
 * Tries each marker pair in order until one matches. This allows a single
 * file to use different comment styles, or a project to support multiple
 * languages without configuration per file.
 *
 * @param {string} content - Full file content.
 * @param {string} regionName - Name of the region to extract.
 * @param {string} filePath - File path (for error messages).
 * @param {Array<{start: RegExp, end: RegExp}>} markers - Region marker pairs to try.
 * @returns {string} The content between the region markers.
 * @throws {Error} If the region is not found with any marker pair.
 */
export function extractRegion(content, regionName, filePath, markers) {
  const lines = content.split('\n');
  let capturing = false;
  const captured = [];
  let found = false;

  for (const line of lines) {
    // Try each marker pair for start/end matching
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
      `remark-code-region: region '${regionName}' not found in ${filePath}`
    );
  }

  return captured.join('\n');
}
