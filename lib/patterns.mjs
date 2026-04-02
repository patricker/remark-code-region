/**
 * Default patterns for region markers and test-line stripping.
 */

/**
 * A region marker pair: a start pattern and an end pattern.
 * Each regex must capture the region name as group 1.
 *
 * @typedef {Object} RegionMarker
 * @property {RegExp} start - Matches the region start line. Group 1 = region name.
 * @property {RegExp} end - Matches the region end line. Group 1 = region name.
 */

/** Default marker pairs — covers # and // comment styles. */
export const DEFAULT_REGION_MARKERS = [
  {
    // Python, bash, Ruby, YAML, TOML
    start: /^[ \t]*#\s*region:\s*(\S+)\s*$/,
    end: /^[ \t]*#\s*endregion:\s*(\S+)\s*$/,
  },
  {
    // JavaScript, TypeScript, Rust, Go, Java, C, C++, Swift, Kotlin
    start: /^[ \t]*\/\/\s*region:\s*(\S+)\s*$/,
    end: /^[ \t]*\/\/\s*endregion:\s*(\S+)\s*$/,
  },
];

/**
 * Additional marker presets for languages not covered by the defaults.
 * Import and spread into regionMarkers to enable.
 */
export const PRESET_MARKERS = {
  /** CSS, HTML (<!-- -->), SCSS, C block comments */
  css: {
    start: /^[ \t]*\/\*\s*region:\s*(\S+)\s*\*\/\s*$/,
    end: /^[ \t]*\/\*\s*endregion:\s*(\S+)\s*\*\/\s*$/,
  },
  /** HTML comments */
  html: {
    start: /^[ \t]*<!--\s*region:\s*(\S+)\s*-->\s*$/,
    end: /^[ \t]*<!--\s*endregion:\s*(\S+)\s*-->\s*$/,
  },
  /** SQL, Lua, Haskell */
  sql: {
    start: /^[ \t]*--\s*region:\s*(\S+)\s*$/,
    end: /^[ \t]*--\s*endregion:\s*(\S+)\s*$/,
  },
};

/**
 * Strip patterns grouped by language/framework.
 * Import individual groups to compose a custom strip list.
 */
export const PRESET_STRIP = {
  python: [
    /^\s*assert\s/, // assert ...
  ],
  rust: [
    /^\s*assert_eq!\s*\(/, // assert_eq!(...)
    /^\s*assert_ne!\s*\(/, // assert_ne!(...)
  ],
  java: [
    /^\s*assertEquals\s*\(/, // assertEquals(...)
    /^\s*assertNotEquals\s*\(/, // assertNotEquals(...)
    /^\s*assertNull\s*\(/, // assertNull(...)
    /^\s*assertNotNull\s*\(/, // assertNotNull(...)
    /^\s*assertThrows\s*\(/, // assertThrows(...)
    /^\s*assertTrue\s*\(/, // assertTrue(...)
    /^\s*assertFalse\s*\(/, // assertFalse(...)
  ],
  js: [
    /^\s*expect\s*\(/, // expect(...)
  ],
  cpp: [
    /^\s*ASSERT_/, // ASSERT_*
    /^\s*EXPECT_/, // EXPECT_*
  ],
  go: [
    /^\s*if err != nil \{\s*t\.Fatal/, // if err != nil { t.Fatal
  ],
  /** Matches lines ending with // test-only or # test-only — works in any language. */
  markers: [
    /.*\/\/\s*test-only\s*$/, // // test-only
    /.*#\s*test-only\s*$/, // # test-only
  ],
};

/**
 * Default strip patterns — the union of all presets.
 * This is what you get when you don't configure stripPatterns at all.
 */
export const DEFAULT_STRIP_PATTERNS = [
  ...PRESET_STRIP.python,
  ...PRESET_STRIP.rust,
  ...PRESET_STRIP.java,
  ...PRESET_STRIP.js,
  ...PRESET_STRIP.cpp,
  ...PRESET_STRIP.go,
  ...PRESET_STRIP.markers,
];

/**
 * Clean step presets for the post-extraction whitespace pipeline.
 *
 * Available steps:
 *   'dedent'   — remove common leading whitespace
 *   'collapse' — collapse 3+ consecutive blank lines to 2
 *   'trim'     — trim leading and trailing whitespace
 *   'trimEnd'  — trim trailing whitespace only
 */
export const PRESET_CLEAN = {
  /** Default: dedent, collapse blank runs, trim both ends. */
  default: ['dedent', 'collapse', 'trim'],
  /** remark-code-import compat: only strip trailing whitespace (no dedent, no collapse). */
  compat: ['trimEnd'],
};

/** Default clean steps — used when the clean option is undefined. */
export const DEFAULT_CLEAN = PRESET_CLEAN.default;
