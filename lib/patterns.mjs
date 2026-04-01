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
    end:   /^[ \t]*#\s*endregion:\s*(\S+)\s*$/,
  },
  {
    // JavaScript, TypeScript, Rust, Go, Java, C, C++, Swift, Kotlin
    start: /^[ \t]*\/\/\s*region:\s*(\S+)\s*$/,
    end:   /^[ \t]*\/\/\s*endregion:\s*(\S+)\s*$/,
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
    end:   /^[ \t]*\/\*\s*endregion:\s*(\S+)\s*\*\/\s*$/,
  },
  /** HTML comments */
  html: {
    start: /^[ \t]*<!--\s*region:\s*(\S+)\s*-->\s*$/,
    end:   /^[ \t]*<!--\s*endregion:\s*(\S+)\s*-->\s*$/,
  },
  /** SQL, Lua, Haskell */
  sql: {
    start: /^[ \t]*--\s*region:\s*(\S+)\s*$/,
    end:   /^[ \t]*--\s*endregion:\s*(\S+)\s*$/,
  },
};

/**
 * Default patterns for lines that should be stripped from injected code.
 * These are test assertions and test-only markers that belong in the test
 * file but not in documentation.
 */
export const DEFAULT_STRIP_PATTERNS = [
  /^\s*assert\s/,                        // Python: assert ...
  /^\s*assert_eq!\s*\(/,                 // Rust: assert_eq!(...)
  /^\s*assert_ne!\s*\(/,                 // Rust: assert_ne!(...)
  /^\s*assertEquals\s*\(/,               // Java: assertEquals(...)
  /^\s*assertNotEquals\s*\(/,            // Java: assertNotEquals(...)
  /^\s*assertNull\s*\(/,                 // Java: assertNull(...)
  /^\s*assertNotNull\s*\(/,              // Java: assertNotNull(...)
  /^\s*assertThrows\s*\(/,              // Java: assertThrows(...)
  /^\s*assertTrue\s*\(/,                 // Java: assertTrue(...)
  /^\s*assertFalse\s*\(/,               // Java: assertFalse(...)
  /^\s*expect\s*\(/,                     // JS: expect(...)
  /^\s*ASSERT_/,                         // C/C++: ASSERT_*
  /^\s*EXPECT_/,                         // C/C++: EXPECT_*
  /^\s*if err != nil \{\s*t\.Fatal/,     // Go: if err != nil { t.Fatal
  /.*\/\/\s*test-only\s*$/,              // Any: // test-only
  /.*#\s*test-only\s*$/,                 // Python/bash: # test-only
];
