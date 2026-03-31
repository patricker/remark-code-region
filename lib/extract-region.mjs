/**
 * Extract a named region from file content.
 *
 * Regions are delimited by comment markers:
 *   # region: name   / # endregion: name     (Python, bash)
 *   // region: name  / // endregion: name    (JS, Rust, Go, Java, C, C++)
 *
 * @param {string} content - Full file content.
 * @param {string} regionName - Name of the region to extract.
 * @param {string} filePath - File path (for error messages).
 * @param {RegExp} startPattern - Regex matching region start markers.
 * @param {RegExp} endPattern - Regex matching region end markers.
 * @returns {string} The content between the region markers.
 * @throws {Error} If the region is not found.
 */
export function extractRegion(content, regionName, filePath, startPattern, endPattern) {
  const lines = content.split('\n');
  let capturing = false;
  const captured = [];
  let found = false;

  for (const line of lines) {
    const startMatch = line.match(startPattern);
    const endMatch = line.match(endPattern);

    if (startMatch && startMatch[1] === regionName) {
      capturing = true;
      found = true;
      continue;
    }
    if (endMatch && endMatch[1] === regionName) {
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
