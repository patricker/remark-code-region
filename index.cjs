/**
 * remark-code-region — CJS entry point.
 *
 * Wraps the ESM implementation for require() compatibility.
 * Docusaurus and other CJS-based configs can use:
 *
 *   const codeRegion = require('remark-code-region');
 */

// Re-implement in CJS to avoid async import() issues in remark plugin chains.
// This is a standalone CJS copy of the plugin logic — kept in sync with index.mjs.

const { visit } = require('unist-util-visit');
const fs = require('node:fs');
const path = require('node:path');

// --- Patterns (inlined from lib/patterns.mjs) ---

const REGION_START = /^[ \t]*(?:\/\/|#)\s*region:\s*(\S+)\s*$/;
const REGION_END = /^[ \t]*(?:\/\/|#)\s*endregion:\s*(\S+)\s*$/;

const DEFAULT_STRIP_PATTERNS = [
  /^\s*assert\s/,
  /^\s*assert_eq!\s*\(/,
  /^\s*assert_ne!\s*\(/,
  /^\s*assertEquals\s*\(/,
  /^\s*assertNotEquals\s*\(/,
  /^\s*assertNull\s*\(/,
  /^\s*assertNotNull\s*\(/,
  /^\s*assertThrows\s*\(/,
  /^\s*assertTrue\s*\(/,
  /^\s*assertFalse\s*\(/,
  /^\s*expect\s*\(/,
  /^\s*ASSERT_/,
  /^\s*EXPECT_/,
  /^\s*if err != nil \{\s*t\.Fatal/,
  /.*\/\/\s*test-only\s*$/,
  /.*#\s*test-only\s*$/,
];

// --- Extract region ---

function extractRegion(content, regionName, filePath) {
  const lines = content.split('\n');
  let capturing = false;
  const captured = [];
  let found = false;

  for (const line of lines) {
    const startMatch = line.match(REGION_START);
    const endMatch = line.match(REGION_END);

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

// --- Strip asserts ---

function stripAsserts(code, patterns) {
  return code
    .split('\n')
    .filter(line => !patterns.some(pat => pat.test(line)))
    .join('\n');
}

function cleanCode(code, { keepAsserts = false, patterns = [] } = {}) {
  let result = code;
  if (!keepAsserts) {
    result = stripAsserts(result, patterns);
  }
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}

// --- Plugin ---

function remarkCodeRegion(options = {}) {
  const {
    rootDir,
    stripPatterns = [],
    keepAsserts: globalKeepAsserts = false,
    attribute = 'reference',
  } = options;

  const allPatterns = [...DEFAULT_STRIP_PATTERNS, ...stripPatterns];
  const attrRegex = new RegExp(`${attribute}="([^"]+)"`);

  return (tree, file) => {
    const baseDir = rootDir || (file && file.cwd) || process.cwd();

    visit(tree, 'code', (node) => {
      if (!node.meta) return;

      const refMatch = node.meta.match(attrRegex);
      if (!refMatch) return;

      let ref = refMatch[1];
      const blockKeepAsserts = ref.includes('?keepAsserts');
      ref = ref.replace('?keepAsserts', '');

      const hashIndex = ref.indexOf('#');
      const filePath = hashIndex >= 0 ? ref.slice(0, hashIndex) : ref;
      const regionName = hashIndex >= 0 ? ref.slice(hashIndex + 1) : null;

      const absPath = path.resolve(baseDir, filePath);

      let content;
      try {
        content = fs.readFileSync(absPath, 'utf-8');
      } catch (e) {
        throw new Error(
          `remark-code-region: cannot read file '${filePath}' (resolved to '${absPath}'): ${e.message}`
        );
      }

      let code;
      if (regionName) {
        code = extractRegion(content, regionName, filePath);
      } else {
        code = content;
      }

      code = cleanCode(code, {
        keepAsserts: globalKeepAsserts || blockKeepAsserts,
        patterns: allPatterns,
      });

      node.value = code;
      node.meta = node.meta.replace(new RegExp(`\\s*${attribute}="[^"]*"`), '').trim() || null;
    });
  };
}

module.exports = remarkCodeRegion;
