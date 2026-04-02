/**
 * remark-code-region
 *
 * Every code block in your docs is extracted from a passing test.
 *
 * A remark plugin that injects code from external source files into markdown
 * code fences using named regions. Test your examples in CI, and your docs
 * pull the tested code at build time.
 *
 * Supports two syntaxes:
 *   reference="tests/test_api.py#parse_basic"       — regions, path relative to rootDir
 *   file=./tests/test_api.py#L3-L6                  — line ranges or regions, path relative to markdown file
 */

import fs from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';
import { extractLines } from './lib/extract-lines.mjs';
import { extractRegion } from './lib/extract-region.mjs';
import {
  DEFAULT_CLEAN,
  DEFAULT_REGION_MARKERS,
  DEFAULT_STRIP_PATTERNS,
} from './lib/patterns.mjs';
import { cleanCode } from './lib/strip-asserts.mjs';

/** Regex to find reference="..." in code fence meta. */
const REF_REGEX = /reference="([^"]+)"/;

/** Regex to find file=... (unquoted, backslash-escaped spaces) in code fence meta. */
const FILE_REGEX = /(?:^|\s)file=((?:[^\s\\]|\\.)+)/;

/** Regex to detect line-range fragments like L3, L3-L6, L3- */
const LINE_RANGE_RE = /^L(\d+)(?:-(?:L?(\d+))?)?$/;

/** Prefix for rootDir-relative file= paths. */
const ROOT_DIR_PREFIX = '<rootDir>/';

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
 * @property {string[]|false} [clean] - Cleaning steps. false=disable, undefined=defaults, string[]=custom list. Steps: 'dedent', 'collapse', 'trim', 'trimEnd'.
 * @property {string} [regionSeparator='\n\n'] - String inserted between concatenated regions in multi-region references.
 * @property {boolean} [preserveFileMeta=false] - Keep file= in meta after processing (matches remark-code-import behavior). Default: false (strip it).
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
    clean,
    regionSeparator = '\n\n',
    preserveFileMeta = false,
  } = options;

  // Resolve strip patterns: false=none, array=use it, undefined=defaults
  const stripPatterns =
    strip === false
      ? []
      : Array.isArray(strip)
        ? strip
        : DEFAULT_STRIP_PATTERNS;

  // Resolve clean steps: false=none, array=use it, undefined=defaults
  const cleanSteps =
    clean === false ? [] : Array.isArray(clean) ? clean : DEFAULT_CLEAN;

  return (tree, file) => {
    const baseDir = rootDir || file?.cwd || process.cwd();
    const resolvedBase = path.resolve(baseDir);

    visit(tree, 'code', (node) => {
      if (!node.meta) return;

      // Try reference= first (takes precedence), then file=
      const refMatch = node.meta.match(REF_REGEX);
      const fileMatch = !refMatch ? node.meta.match(FILE_REGEX) : null;
      if (!refMatch && !fileMatch) return;

      const isFileDirective = !!fileMatch;
      let raw = isFileDirective ? fileMatch[1] : refMatch[1];

      // Unescape backslash-spaces in file= values
      if (isFileDirective) {
        raw = raw.replace(/\\(.)/g, '$1');
      }

      // Determine path resolution base
      let resolveDir;
      if (!isFileDirective) {
        // reference= always resolves relative to rootDir
        resolveDir = baseDir;
      } else if (raw.startsWith(ROOT_DIR_PREFIX)) {
        // file=<rootDir>/... resolves relative to rootDir
        raw = raw.slice(ROOT_DIR_PREFIX.length);
        resolveDir = baseDir;
      } else {
        // file= resolves relative to the markdown file's directory
        resolveDir = file?.dirname || file?.cwd || process.cwd();
      }

      // Split file path and fragment list, then parse ?flags from the end
      const hashIndex = raw.indexOf('#');
      const filePath = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
      let fragmentStr = hashIndex >= 0 ? raw.slice(hashIndex + 1) : null;

      // Parse flags from ?query at the end of the fragment string
      const qIndex = fragmentStr ? fragmentStr.indexOf('?') : -1;
      const flags = qIndex >= 0 ? fragmentStr.slice(qIndex + 1).split('&') : [];
      fragmentStr = qIndex >= 0 ? fragmentStr.slice(0, qIndex) : fragmentStr;

      const blockNoStrip = flags.includes('noStrip');

      // Split fragments on commas, trim whitespace, drop empties
      const fragments = fragmentStr
        ? fragmentStr
            .split(',')
            .map((f) => f.trim())
            .filter(Boolean)
        : [];

      const absPath = path.resolve(resolveDir, filePath);

      // Security: prevent references outside root
      if (
        !allowOutsideRoot &&
        !absPath.startsWith(resolvedBase + path.sep) &&
        absPath !== resolvedBase
      ) {
        const msg = `remark-code-region: '${filePath}' resolves outside the root directory '${resolvedBase}'`;
        if (file?.fail) {
          file.fail(msg);
          return;
        }
        throw new Error(msg);
      }

      // Read the source file
      let content;
      try {
        content = fs.readFileSync(absPath, 'utf-8');
      } catch (e) {
        const msg = `remark-code-region: cannot read file '${filePath}' (resolved to '${absPath}'): ${e.message}`;
        if (file?.fail) {
          file.fail(msg);
          return;
        }
        throw new Error(msg);
      }

      // Extract: line ranges, named regions, or full file
      let code;
      try {
        if (fragments.length === 0) {
          code = content;
        } else {
          const parts = [];
          for (const frag of fragments) {
            if (LINE_RANGE_RE.test(frag)) {
              parts.push(extractLines(content, frag, filePath));
            } else {
              parts.push(extractRegion(content, frag, filePath, regionMarkers));
            }
          }
          code = parts.join(regionSeparator);
        }
      } catch (e) {
        if (file?.fail) {
          file.fail(e.message);
          return;
        }
        throw e;
      }

      // Clean: strip asserts + whitespace pipeline
      code = cleanCode(code, {
        noStrip: blockNoStrip || strip === false,
        patterns: stripPatterns,
        clean: cleanSteps,
      });

      node.value = code;

      // Remove the matched attribute from meta.
      if (isFileDirective) {
        if (!preserveFileMeta) {
          node.meta =
            node.meta.replace(/\s*file=(?:[^\s\\]|\\.)+/, '').trim() || null;
        }
      } else {
        node.meta =
          node.meta.replace(/\s*reference="[^"]*"/, '').trim() || null;
      }
    });
  };
}

// Re-export presets for user composition
export {
  DEFAULT_CLEAN,
  DEFAULT_REGION_MARKERS,
  DEFAULT_STRIP_PATTERNS,
  PRESET_CLEAN,
  PRESET_MARKERS,
  PRESET_STRIP,
} from './lib/patterns.mjs';
