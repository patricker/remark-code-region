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
import { SKIP, visit } from 'unist-util-visit';
import { formatDiff } from './lib/diff-regions.mjs';
import { extractLines, LINE_RANGE_RE } from './lib/extract-lines.mjs';
import { extractRegion } from './lib/extract-region.mjs';
import {
  DEFAULT_CLEAN,
  DEFAULT_REGION_MARKERS,
  DEFAULT_STRIP_PATTERNS,
} from './lib/patterns.mjs';
import { cleanCode } from './lib/strip-asserts.mjs';
import { groupTabsInParent, TAB_REGEX } from './lib/tab-groups.mjs';

/** Regex to find reference="..." in code fence meta (not diff-reference). */
const REF_REGEX = /(?:^|\s)(?<!-)reference="([^"]+)"/;

/** Regex to find file=... (unquoted, backslash-escaped spaces, not diff-file=). */
const FILE_REGEX = /(?:^|(?<!-)(?<=\s))file=((?:[^\s\\]|\\.)+)/;

/** Regex to find diff-reference="..." in code fence meta. */
const DIFF_REF_REGEX = /(?:^|\s)diff-reference="([^"]+)"/;

/** Regex to find diff-file=... in code fence meta. */
const DIFF_FILE_REGEX = /(?:^|\s)diff-file=((?:[^\s\\]|\\.)+)/;

/** Regex to find diff-step="..." in code fence meta (tutorial step diffing). */
const DIFF_STEP_REGEX = /(?:^|\s)diff-step="([^"]+)"/;

/** Prefix for rootDir-relative file= paths. */
const ROOT_DIR_PREFIX = '<rootDir>/';

/**
 * Parse ?flags from a raw reference value (e.g., "file.py#region?noStrip&format=unified").
 * @param {string} rawValue
 * @param {'unified'|'inline-annotations'|'side-by-side'} defaultFormat
 * @returns {{ flagOverrides: { noStrip: boolean, noTransmute: boolean }, effectiveDiffFormat: string }}
 */
function parseFlags(rawValue, defaultFormat) {
  const hashIndex = rawValue.indexOf('#');
  const fragStr = hashIndex >= 0 ? rawValue.slice(hashIndex + 1) : null;
  const qIndex = fragStr ? fragStr.indexOf('?') : -1;
  const flags = qIndex >= 0 ? fragStr.slice(qIndex + 1).split('&') : [];
  const formatFlag = flags.find((f) => f.startsWith('format='));
  return {
    flagOverrides: {
      noStrip: flags.includes('noStrip'),
      noTransmute: flags.includes('noTransmute'),
    },
    effectiveDiffFormat: formatFlag
      ? formatFlag.slice('format='.length)
      : defaultFormat,
    formatFlag: formatFlag || null,
  };
}

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
 * @property {Array<{match: RegExp, template: string}>|false} [transmute] - Transmute rules. false/undefined=disabled, array=use rules.
 * @property {string[]|false} [clean] - Cleaning steps. false=disable, undefined=defaults, string[]=custom list.
 * @property {string} [regionSeparator='\n\n'] - String inserted between concatenated regions.
 * @property {boolean} [preserveFileMeta=false] - Keep file= in meta after processing.
 * @property {'unified'|'inline-annotations'|'side-by-side'} [diffFormat='unified'] - Output format for diff blocks.
 * @property {string} [tabGroupClass='code-tabs'] - CSS class for tab group wrapper div.
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
    transmute,
    clean,
    regionSeparator = '\n\n',
    preserveFileMeta = false,
    diffFormat = 'unified',
    tabGroupClass = 'code-tabs',
  } = options;

  // Resolve strip patterns: false=none, array=use it, undefined=defaults
  const stripPatterns =
    strip === false
      ? []
      : Array.isArray(strip)
        ? strip
        : DEFAULT_STRIP_PATTERNS;

  // Resolve transmute rules: undefined/false=none, array=use it
  const transmuteRules = Array.isArray(transmute) ? transmute : [];

  // Resolve clean steps: false=none, array=use it, undefined=defaults
  const cleanSteps =
    clean === false ? [] : Array.isArray(clean) ? clean : DEFAULT_CLEAN;

  /**
   * Resolve a raw reference value to extracted, cleaned code.
   *
   * @param {string} rawValue - The raw directive value (e.g., "tests/test_api.py#region")
   * @param {boolean} isFile - Whether this is a file= directive (vs reference=)
   * @param {string} resolveBase - Directory to resolve paths against
   * @param {string} securityBase - Resolved rootDir for security checks
   * @param {object} vfile - The vfile object (for fail())
   * @param {string} lang - Code fence language tag
   * @param {object} [opts] - Optional parameters.
   * @param {object} [opts.flagOverrides] - Per-block flag overrides { noStrip, noTransmute }
   * @param {string|null} [opts.fallbackAbsPath] - Abs path to use when rawValue has no file portion
   * @returns {{ code: string, absPath: string }}
   */
  function resolveRef(
    rawValue,
    isFile,
    resolveBase,
    securityBase,
    vfile,
    lang,
    opts = {},
  ) {
    const { flagOverrides = {}, fallbackAbsPath = null } = opts;
    let raw = rawValue;

    // Unescape backslash-spaces in file= values
    if (isFile) {
      raw = raw.replace(/\\(.)/g, '$1');
    }

    // Handle <rootDir> prefix for file= directives
    let resolveDir = resolveBase;
    if (isFile && raw.startsWith(ROOT_DIR_PREFIX)) {
      raw = raw.slice(ROOT_DIR_PREFIX.length);
      resolveDir = rootDir || vfile?.cwd || process.cwd();
    }

    // Split file path and fragment list, then parse ?flags from the end
    const hashIndex = raw.indexOf('#');
    const filePath = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
    let fragmentStr = hashIndex >= 0 ? raw.slice(hashIndex + 1) : null;

    // Parse flags from ?query at the end of the fragment string
    const qIndex = fragmentStr ? fragmentStr.indexOf('?') : -1;
    const flags = qIndex >= 0 ? fragmentStr.slice(qIndex + 1).split('&') : [];
    fragmentStr = qIndex >= 0 ? fragmentStr.slice(0, qIndex) : fragmentStr;

    // Merge per-block flags from primary directive
    const noStrip =
      flags.includes('noStrip') || flagOverrides.noStrip || strip === false;
    const noTransmute =
      flags.includes('noTransmute') ||
      flagOverrides.noTransmute ||
      !transmuteRules.length;

    // Split fragments on commas, trim whitespace, drop empties
    const fragments = fragmentStr
      ? fragmentStr
          .split(',')
          .map((f) => f.trim())
          .filter(Boolean)
      : [];

    // Resolve path — use fallback if no file portion (same-file shorthand)
    const absPath =
      filePath || !fallbackAbsPath
        ? path.resolve(resolveDir, filePath)
        : fallbackAbsPath;

    // Security: prevent references outside root
    if (
      !allowOutsideRoot &&
      !absPath.startsWith(securityBase + path.sep) &&
      absPath !== securityBase
    ) {
      const msg = `remark-code-region: '${filePath || raw}' resolves outside the root directory '${securityBase}'`;
      if (vfile?.fail) {
        vfile.fail(msg);
        return { code: '', absPath };
      }
      throw new Error(msg);
    }

    // Read the source file
    let content;
    try {
      content = fs.readFileSync(absPath, 'utf-8').replace(/\r\n/g, '\n');
    } catch (e) {
      const msg = `remark-code-region: cannot read file '${filePath || raw}' (resolved to '${absPath}'): ${e.message}`;
      if (vfile?.fail) {
        vfile.fail(msg);
        return { code: '', absPath };
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
            parts.push(extractLines(content, frag, filePath || raw));
          } else {
            parts.push(
              extractRegion(content, frag, filePath || raw, regionMarkers),
            );
          }
        }
        code = parts.join(regionSeparator);
      }
    } catch (e) {
      if (vfile?.fail) {
        vfile.fail(e.message);
        return { code: '', absPath };
      }
      throw e;
    }

    // Clean: transmute + strip asserts + whitespace pipeline
    code = cleanCode(code, {
      noStrip,
      noTransmute,
      patterns: stripPatterns,
      transmuteRules,
      lang,
      clean: cleanSteps,
    });

    return { code, absPath };
  }

  // Register stringify handler so remark-stringify can serialize tabGroup nodes
  const selfData = this.data();
  if (!selfData.toMarkdownExtensions) {
    selfData.toMarkdownExtensions = [];
  }
  selfData.toMarkdownExtensions.push({
    handlers: {
      tabGroup(node, _parent, state, info) {
        return state.containerFlow(node, info);
      },
    },
  });

  return (tree, file) => {
    const baseDir = rootDir || file?.cwd || process.cwd();
    const resolvedBase = path.resolve(baseDir);

    visit(tree, 'code', (node, index, parent) => {
      if (!node.meta) return;

      // Try reference= first (takes precedence), then file=
      const refMatch = node.meta.match(REF_REGEX);
      const fileMatch = !refMatch ? node.meta.match(FILE_REGEX) : null;

      // Check for diff-reference= / diff-file= / diff-step=
      const diffRefMatch = node.meta.match(DIFF_REF_REGEX);
      const diffFileMatch = !diffRefMatch
        ? node.meta.match(DIFF_FILE_REGEX)
        : null;
      const diffStepMatch = node.meta.match(DIFF_STEP_REGEX);
      const hasDiff = !!(diffRefMatch || diffFileMatch);
      const hasDiffStep = !!diffStepMatch;

      // Mutual exclusion: can't combine diff-reference/diff-file with diff-step
      if (hasDiff && hasDiffStep) {
        const msg =
          'remark-code-region: diff-reference/diff-file and diff-step cannot be used on the same code block';
        if (file?.fail) {
          file.fail(msg);
          return;
        }
        throw new Error(msg);
      }

      // If no primary reference and no diff attribute, skip
      if (!refMatch && !fileMatch) {
        // Error if diff attr present without primary
        if (hasDiff || hasDiffStep) {
          const msg =
            'remark-code-region: diff-reference/diff-file/diff-step requires a primary reference= or file= on the same code block';
          if (file?.fail) {
            file.fail(msg);
            return;
          }
          throw new Error(msg);
        }
        return;
      }

      const isFileDirective = !!fileMatch;
      const primaryRaw = isFileDirective ? fileMatch[1] : refMatch[1];

      // Determine path resolution base for the primary reference
      let primaryResolveDir;
      if (!isFileDirective) {
        primaryResolveDir = baseDir;
      } else if (primaryRaw.startsWith(ROOT_DIR_PREFIX)) {
        primaryResolveDir = baseDir;
      } else {
        primaryResolveDir = file?.dirname || file?.cwd || process.cwd();
      }

      // Parse per-block flag overrides and format from primary reference
      const { flagOverrides, effectiveDiffFormat, formatFlag } = parseFlags(
        primaryRaw,
        diffFormat,
      );

      // Extract and clean the primary reference
      const primary = resolveRef(
        primaryRaw,
        isFileDirective,
        primaryResolveDir,
        resolvedBase,
        file,
        node.lang || '',
        { flagOverrides },
      );

      if (hasDiff) {
        // --- Diff mode ---
        const isDiffFile = !!diffFileMatch;
        const diffRaw = isDiffFile ? diffFileMatch[1] : diffRefMatch[1];

        // Determine resolve dir for diff target
        let diffResolveDir;
        if (isDiffFile) {
          // diff-file= resolves relative to markdown file
          diffResolveDir = file?.dirname || file?.cwd || process.cwd();
        } else {
          // diff-reference= resolves relative to rootDir
          diffResolveDir = baseDir;
        }

        // Extract and clean the diff target (same-file shorthand uses primary's absPath)
        const diffTarget = resolveRef(
          diffRaw,
          isDiffFile,
          diffResolveDir,
          resolvedBase,
          file,
          node.lang || '',
          { flagOverrides, fallbackAbsPath: primary.absPath },
        );

        // Format the diff
        const result = formatDiff(
          primary.code,
          diffTarget.code,
          effectiveDiffFormat,
        );

        if (result.mode === 'side-by-side') {
          // tab= + side-by-side is not supported (splice creates ambiguous semantics)
          if (node.meta && TAB_REGEX.test(node.meta)) {
            const msg =
              'remark-code-region: tab= cannot be combined with side-by-side diff format';
            if (file?.fail) {
              file.fail(msg);
              return;
            }
            throw new Error(msg);
          }
          // Emit two sibling nodes
          const baseMeta = cleanDiffMeta(
            node.meta,
            isFileDirective,
            preserveFileMeta,
          );
          const beforeNode = {
            type: 'code',
            lang: node.lang,
            meta: baseMeta
              ? `${baseMeta} data-diff-role="before"`
              : 'data-diff-role="before"',
            value: result.before,
          };
          const afterNode = {
            type: 'code',
            lang: node.lang,
            meta: baseMeta
              ? `${baseMeta} data-diff-role="after"`
              : 'data-diff-role="after"',
            value: result.after,
          };
          parent.children.splice(index, 1, beforeNode, afterNode);
          return [SKIP, index + 2];
        }

        // unified or inline-annotations: single node
        node.value = result.value;
        if (result.mode === 'unified') {
          node.lang = 'diff';
        }
      } else if (hasDiffStep) {
        // --- Diff-step mode (tutorial steps) ---
        // Extract the previous step from the same file
        const previousStep = resolveRef(
          `#${diffStepMatch[1]}`,
          isFileDirective,
          primaryResolveDir,
          resolvedBase,
          file,
          node.lang || '',
          { flagOverrides, fallbackAbsPath: primary.absPath },
        );

        // Default to inline-annotations for diff-step (shows full code with highlights)
        const stepFormat =
          effectiveDiffFormat === 'unified' && !formatFlag
            ? 'inline-annotations'
            : effectiveDiffFormat;

        const result = formatDiff(previousStep.code, primary.code, stepFormat);

        if (result.mode === 'side-by-side') {
          const msg =
            'remark-code-region: side-by-side format is not supported with diff-step';
          if (file?.fail) {
            file.fail(msg);
            return;
          }
          throw new Error(msg);
        }

        if (result.mode === 'unified') {
          node.value = result.value;
          node.lang = 'diff';
        } else {
          // inline-annotations: full current code with change markers
          node.value = result.value || primary.code;
        }
      } else {
        // --- Normal mode (no diff) ---
        node.value = primary.code;
      }

      // Clean meta: remove directive attributes
      node.meta = cleanDiffMeta(node.meta, isFileDirective, preserveFileMeta);
    });

    // Pass 2: group consecutive tab= fences into tabGroup wrapper nodes
    groupTabsInParent(tree, tabGroupClass);
  };
}

/**
 * Strip reference=, file=, diff-reference=, diff-file=, diff-step=, and diff keyword from meta.
 */
function cleanDiffMeta(meta, isFileDirective, preserveFileMeta) {
  let m = meta;
  // Strip diff directives FIRST (before primary, since "file=" matches inside "diff-file=")
  m = m.replace(/\s*diff-reference="[^"]*"/, '');
  m = m.replace(/\s*diff-file=(?:[^\s\\]|\\.)+/, '');
  m = m.replace(/\s*diff-step="[^"]*"/, '');
  // Strip standalone diff keyword
  m = m.replace(/(?:^|\s)diff(?=\s|$)/, '');
  // Strip primary directive
  if (isFileDirective) {
    if (!preserveFileMeta) {
      m = m.replace(/\s*file=(?:[^\s\\]|\\.)+/, '');
    }
  } else {
    m = m.replace(/\s*reference="[^"]*"/, '');
  }
  return m.trim() || null;
}

// Re-export presets for user composition
export {
  COMMENT_PREFIX,
  DEFAULT_CLEAN,
  DEFAULT_REGION_MARKERS,
  DEFAULT_STRIP_PATTERNS,
  DEFAULT_TRANSMUTE_RULES,
  PRESET_CLEAN,
  PRESET_MARKERS,
  PRESET_STRIP,
  PRESET_TRANSMUTE,
} from './lib/patterns.mjs';
