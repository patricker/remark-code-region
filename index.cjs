/**
 * remark-code-region — CJS entry point.
 *
 * Wraps the ESM implementation for require() compatibility.
 * Docusaurus and other CJS-based configs can use:
 *
 *   const codeRegion = require('remark-code-region');
 */

const { visit } = require('unist-util-visit');
const fs = require('node:fs');
const path = require('node:path');

// --- Default region markers ---

const DEFAULT_REGION_MARKERS = [
  {
    start: /^[ \t]*#\s*region:\s*(\S+)\s*$/,
    end:   /^[ \t]*#\s*endregion:\s*(\S+)\s*$/,
  },
  {
    start: /^[ \t]*\/\/\s*region:\s*(\S+)\s*$/,
    end:   /^[ \t]*\/\/\s*endregion:\s*(\S+)\s*$/,
  },
];

const PRESET_MARKERS = {
  css: {
    start: /^[ \t]*\/\*\s*region:\s*(\S+)\s*\*\/\s*$/,
    end:   /^[ \t]*\/\*\s*endregion:\s*(\S+)\s*\*\/\s*$/,
  },
  html: {
    start: /^[ \t]*<!--\s*region:\s*(\S+)\s*-->\s*$/,
    end:   /^[ \t]*<!--\s*endregion:\s*(\S+)\s*-->\s*$/,
  },
  sql: {
    start: /^[ \t]*--\s*region:\s*(\S+)\s*$/,
    end:   /^[ \t]*--\s*endregion:\s*(\S+)\s*$/,
  },
};

// --- Default strip patterns ---

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

function extractRegion(content, regionName, filePath, markers) {
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
    regionMarkers = DEFAULT_REGION_MARKERS,
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
        code = extractRegion(content, regionName, filePath, regionMarkers);
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

remarkCodeRegion.DEFAULT_REGION_MARKERS = DEFAULT_REGION_MARKERS;
remarkCodeRegion.PRESET_MARKERS = PRESET_MARKERS;

module.exports = remarkCodeRegion;
