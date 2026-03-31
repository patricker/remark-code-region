/**
 * Default patterns for region markers and test-line stripping.
 */

/** Matches the start of a named region in any supported comment style. */
export const REGION_START = /^[ \t]*(?:\/\/|#)\s*region:\s*(\S+)\s*$/;

/** Matches the end of a named region in any supported comment style. */
export const REGION_END = /^[ \t]*(?:\/\/|#)\s*endregion:\s*(\S+)\s*$/;

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
