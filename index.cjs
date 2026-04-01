var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// index.mjs
var index_exports = {};
__export(index_exports, {
  DEFAULT_REGION_MARKERS: () => DEFAULT_REGION_MARKERS,
  DEFAULT_STRIP_PATTERNS: () => DEFAULT_STRIP_PATTERNS,
  PRESET_MARKERS: () => PRESET_MARKERS,
  PRESET_STRIP: () => PRESET_STRIP,
  default: () => remarkCodeRegion
});
module.exports = __toCommonJS(index_exports);
var import_unist_util_visit = require("unist-util-visit");
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);

// lib/extract-region.mjs
function extractRegion(content, regionName, filePath, markers) {
  const lines = content.split("\n");
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
  if (found && capturing) {
    throw new Error(
      `remark-code-region: region '${regionName}' in ${filePath} was opened but never closed`
    );
  }
  return captured.join("\n");
}

// lib/strip-asserts.mjs
function stripAsserts(code, patterns) {
  return code.split("\n").filter((line) => !patterns.some((pat) => pat.test(line))).join("\n");
}
function dedent(code) {
  const lines = code.split("\n");
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return code;
  const minIndent = Math.min(...nonEmpty.map((l) => l.match(/^(\s*)/)[1].length));
  if (minIndent === 0) return code;
  return lines.map((l) => l.length >= minIndent ? l.slice(minIndent) : l).join("\n");
}
function cleanCode(code, { noStrip = false, patterns = [] } = {}) {
  let result = code;
  if (!noStrip && patterns.length > 0) {
    result = stripAsserts(result, patterns);
  }
  result = dedent(result);
  result = result.replace(/\n{3,}/g, "\n\n");
  return result.trim();
}

// lib/patterns.mjs
var DEFAULT_REGION_MARKERS = [
  {
    // Python, bash, Ruby, YAML, TOML
    start: /^[ \t]*#\s*region:\s*(\S+)\s*$/,
    end: /^[ \t]*#\s*endregion:\s*(\S+)\s*$/
  },
  {
    // JavaScript, TypeScript, Rust, Go, Java, C, C++, Swift, Kotlin
    start: /^[ \t]*\/\/\s*region:\s*(\S+)\s*$/,
    end: /^[ \t]*\/\/\s*endregion:\s*(\S+)\s*$/
  }
];
var PRESET_MARKERS = {
  /** CSS, HTML (<!-- -->), SCSS, C block comments */
  css: {
    start: /^[ \t]*\/\*\s*region:\s*(\S+)\s*\*\/\s*$/,
    end: /^[ \t]*\/\*\s*endregion:\s*(\S+)\s*\*\/\s*$/
  },
  /** HTML comments */
  html: {
    start: /^[ \t]*<!--\s*region:\s*(\S+)\s*-->\s*$/,
    end: /^[ \t]*<!--\s*endregion:\s*(\S+)\s*-->\s*$/
  },
  /** SQL, Lua, Haskell */
  sql: {
    start: /^[ \t]*--\s*region:\s*(\S+)\s*$/,
    end: /^[ \t]*--\s*endregion:\s*(\S+)\s*$/
  }
};
var PRESET_STRIP = {
  python: [
    /^\s*assert\s/
    // assert ...
  ],
  rust: [
    /^\s*assert_eq!\s*\(/,
    // assert_eq!(...)
    /^\s*assert_ne!\s*\(/
    // assert_ne!(...)
  ],
  java: [
    /^\s*assertEquals\s*\(/,
    // assertEquals(...)
    /^\s*assertNotEquals\s*\(/,
    // assertNotEquals(...)
    /^\s*assertNull\s*\(/,
    // assertNull(...)
    /^\s*assertNotNull\s*\(/,
    // assertNotNull(...)
    /^\s*assertThrows\s*\(/,
    // assertThrows(...)
    /^\s*assertTrue\s*\(/,
    // assertTrue(...)
    /^\s*assertFalse\s*\(/
    // assertFalse(...)
  ],
  js: [
    /^\s*expect\s*\(/
    // expect(...)
  ],
  cpp: [
    /^\s*ASSERT_/,
    // ASSERT_*
    /^\s*EXPECT_/
    // EXPECT_*
  ],
  go: [
    /^\s*if err != nil \{\s*t\.Fatal/
    // if err != nil { t.Fatal
  ],
  /** Matches lines ending with // test-only or # test-only — works in any language. */
  markers: [
    /.*\/\/\s*test-only\s*$/,
    // // test-only
    /.*#\s*test-only\s*$/
    // # test-only
  ]
};
var DEFAULT_STRIP_PATTERNS = [
  ...PRESET_STRIP.python,
  ...PRESET_STRIP.rust,
  ...PRESET_STRIP.java,
  ...PRESET_STRIP.js,
  ...PRESET_STRIP.cpp,
  ...PRESET_STRIP.go,
  ...PRESET_STRIP.markers
];

// index.mjs
var REF_REGEX = /reference="([^"]+)"/;
function remarkCodeRegion(options = {}) {
  const {
    rootDir,
    allowOutsideRoot = false,
    regionMarkers = DEFAULT_REGION_MARKERS,
    strip
  } = options;
  const stripPatterns = strip === false ? [] : Array.isArray(strip) ? strip : DEFAULT_STRIP_PATTERNS;
  return (tree, file) => {
    const baseDir = rootDir || file?.cwd || process.cwd();
    const resolvedBase = import_node_path.default.resolve(baseDir);
    (0, import_unist_util_visit.visit)(tree, "code", (node) => {
      if (!node.meta) return;
      const refMatch = node.meta.match(REF_REGEX);
      if (!refMatch) return;
      let ref = refMatch[1];
      const qIndex = ref.indexOf("?");
      const flags = qIndex >= 0 ? ref.slice(qIndex + 1).split("&") : [];
      ref = qIndex >= 0 ? ref.slice(0, qIndex) : ref;
      const blockNoStrip = flags.includes("noStrip");
      const hashIndex = ref.indexOf("#");
      const filePath = hashIndex >= 0 ? ref.slice(0, hashIndex) : ref;
      const regionName = hashIndex >= 0 ? ref.slice(hashIndex + 1) : null;
      const absPath = import_node_path.default.resolve(baseDir, filePath);
      if (!allowOutsideRoot && !absPath.startsWith(resolvedBase + import_node_path.default.sep) && absPath !== resolvedBase) {
        const msg = `remark-code-region: '${filePath}' resolves outside the root directory '${resolvedBase}'`;
        if (file?.fail) {
          file.fail(msg);
          return;
        }
        throw new Error(msg);
      }
      let content;
      try {
        content = import_node_fs.default.readFileSync(absPath, "utf-8");
      } catch (e) {
        const msg = `remark-code-region: cannot read file '${filePath}' (resolved to '${absPath}'): ${e.message}`;
        if (file?.fail) {
          file.fail(msg);
          return;
        }
        throw new Error(msg);
      }
      let code;
      try {
        if (regionName) {
          code = extractRegion(content, regionName, filePath, regionMarkers);
        } else {
          code = content;
        }
      } catch (e) {
        if (file?.fail) {
          file.fail(e.message);
          return;
        }
        throw e;
      }
      code = cleanCode(code, {
        noStrip: blockNoStrip || strip === false,
        patterns: stripPatterns
      });
      node.value = code;
      node.meta = node.meta.replace(/\s*reference="[^"]*"/, "").trim() || null;
    });
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_REGION_MARKERS,
  DEFAULT_STRIP_PATTERNS,
  PRESET_MARKERS,
  PRESET_STRIP
});
