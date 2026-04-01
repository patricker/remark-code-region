/**
 * remark-code-region
 *
 * Every code block in your docs is extracted from a passing test.
 *
 * A remark plugin that injects code from external source files into markdown
 * code fences using named regions. Test your examples in CI, and your docs
 * pull the tested code at build time.
 *
 * @example
 * ```python reference="tests/test_api.py#parse_basic"
 * ```
 */

import { visit } from 'unist-util-visit';
import fs from 'node:fs';
import path from 'node:path';
import { extractRegion } from './lib/extract-region.mjs';
import { cleanCode } from './lib/strip-asserts.mjs';
import { DEFAULT_STRIP_PATTERNS, DEFAULT_REGION_MARKERS } from './lib/patterns.mjs';

/**
 * @typedef {Object} RegionMarker
 * @property {RegExp} start - Regex matching region start. Group 1 = name.
 * @property {RegExp} end - Regex matching region end. Group 1 = name.
 */

/**
 * @typedef {Object} Options
 * @property {string} [rootDir] - Base directory for resolving reference paths. Defaults to process.cwd().
 * @property {RegionMarker[]} [regionMarkers] - Region marker pairs. Defaults cover # and // comments. Add pairs for CSS, SQL, etc.
 * @property {RegExp[]} [stripPatterns] - Additional patterns to strip (merged with defaults).
 * @property {boolean} [keepAsserts=false] - If true, disable assertion stripping globally.
 * @property {string} [attribute='reference'] - The code fence meta attribute name to look for.
 */

/**
 * Create the remark plugin.
 *
 * @param {Options} [options]
 * @returns {function} A remark transformer.
 */
export default function remarkCodeRegion(options = {}) {
  const {
    rootDir,
    regionMarkers = DEFAULT_REGION_MARKERS,
    stripPatterns = [],
    keepAsserts: globalKeepAsserts = false,
    attribute = 'reference',
  } = options;

  // Merge user patterns with defaults
  const allPatterns = [...DEFAULT_STRIP_PATTERNS, ...stripPatterns];

  // Build the regex to find the attribute in code fence meta
  const attrRegex = new RegExp(`${attribute}="([^"]+)"`);

  return (tree, file) => {
    // Resolve base directory: explicit rootDir > file.cwd > process.cwd()
    const baseDir = rootDir || file?.cwd || process.cwd();

    visit(tree, 'code', (node) => {
      if (!node.meta) return;

      const refMatch = node.meta.match(attrRegex);
      if (!refMatch) return;

      let ref = refMatch[1];

      // Per-block keepAsserts override
      const blockKeepAsserts = ref.includes('?keepAsserts');
      ref = ref.replace('?keepAsserts', '');

      const hashIndex = ref.indexOf('#');
      const filePath = hashIndex >= 0 ? ref.slice(0, hashIndex) : ref;
      const regionName = hashIndex >= 0 ? ref.slice(hashIndex + 1) : null;

      const absPath = path.resolve(baseDir, filePath);

      // Read the source file — fail hard if missing
      let content;
      try {
        content = fs.readFileSync(absPath, 'utf-8');
      } catch (e) {
        throw new Error(
          `remark-code-region: cannot read file '${filePath}' (resolved to '${absPath}'): ${e.message}`
        );
      }

      // Extract region or use full file
      let code;
      if (regionName) {
        code = extractRegion(content, regionName, filePath, regionMarkers);
      } else {
        code = content;
      }

      // Clean: strip asserts, collapse blank lines, trim
      code = cleanCode(code, {
        keepAsserts: globalKeepAsserts || blockKeepAsserts,
        patterns: allPatterns,
      });

      node.value = code;

      // Remove the reference attribute from meta so it doesn't appear in output
      node.meta = node.meta.replace(new RegExp(`\\s*${attribute}="[^"]*"`), '').trim() || null;
    });
  };
}

// Re-export presets for convenience
export { DEFAULT_REGION_MARKERS, PRESET_MARKERS } from './lib/patterns.mjs';
