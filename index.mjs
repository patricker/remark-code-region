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

/** Regex to find reference="..." in code fence meta. */
const REF_REGEX = /reference="([^"]+)"/;

/**
 * @typedef {Object} RegionMarker
 * @property {RegExp} start - Regex matching region start. Group 1 = name.
 * @property {RegExp} end - Regex matching region end. Group 1 = name.
 */

/**
 * @typedef {Object} Options
 * @property {string} [rootDir] - Base directory for resolving reference paths. Defaults to process.cwd().
 * @property {boolean} [allowOutsideRoot=false] - Allow references outside rootDir. Default: false (security boundary).
 * @property {RegionMarker[]} [regionMarkers] - Region marker pairs. Defaults cover # and // comments.
 * @property {RegExp[]|false} [strip] - Patterns to strip. false=disable, undefined=defaults, RegExp[]=custom list.
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
    allowOutsideRoot = false,
    regionMarkers = DEFAULT_REGION_MARKERS,
    strip,
  } = options;

  // Resolve strip patterns: false=none, array=use it, undefined=defaults
  const stripPatterns = strip === false
    ? []
    : Array.isArray(strip)
      ? strip
      : DEFAULT_STRIP_PATTERNS;

  return (tree, file) => {
    const baseDir = rootDir || file?.cwd || process.cwd();
    const resolvedBase = path.resolve(baseDir);

    visit(tree, 'code', (node) => {
      if (!node.meta) return;

      const refMatch = node.meta.match(REF_REGEX);
      if (!refMatch) return;

      let ref = refMatch[1];

      // Parse flags from ?query portion
      const qIndex = ref.indexOf('?');
      const flags = qIndex >= 0 ? ref.slice(qIndex + 1).split('&') : [];
      ref = qIndex >= 0 ? ref.slice(0, qIndex) : ref;

      const blockNoStrip = flags.includes('noStrip');

      // Split file path and region name
      const hashIndex = ref.indexOf('#');
      const filePath = hashIndex >= 0 ? ref.slice(0, hashIndex) : ref;
      const regionName = hashIndex >= 0 ? ref.slice(hashIndex + 1) : null;

      const absPath = path.resolve(baseDir, filePath);

      // Security: prevent references outside root
      if (!allowOutsideRoot && !absPath.startsWith(resolvedBase + path.sep) && absPath !== resolvedBase) {
        const msg = `remark-code-region: '${filePath}' resolves outside the root directory '${resolvedBase}'`;
        if (file?.fail) { file.fail(msg); return; }
        throw new Error(msg);
      }

      // Read the source file
      let content;
      try {
        content = fs.readFileSync(absPath, 'utf-8');
      } catch (e) {
        const msg = `remark-code-region: cannot read file '${filePath}' (resolved to '${absPath}'): ${e.message}`;
        if (file?.fail) { file.fail(msg); return; }
        throw new Error(msg);
      }

      // Extract region or use full file
      let code;
      try {
        if (regionName) {
          code = extractRegion(content, regionName, filePath, regionMarkers);
        } else {
          code = content;
        }
      } catch (e) {
        if (file?.fail) { file.fail(e.message); return; }
        throw e;
      }

      // Clean: strip asserts, dedent, collapse blank lines, trim
      code = cleanCode(code, {
        noStrip: blockNoStrip || strip === false,
        patterns: stripPatterns,
      });

      node.value = code;

      // Remove the reference attribute from meta
      node.meta = node.meta.replace(/\s*reference="[^"]*"/, '').trim() || null;
    });
  };
}

// Re-export presets for user composition
export { DEFAULT_REGION_MARKERS, PRESET_MARKERS, PRESET_STRIP, DEFAULT_STRIP_PATTERNS } from './lib/patterns.mjs';
