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

/**
 * Comment prefix by language tag — used by transmutation to emit
 * language-appropriate comments.
 */
export const COMMENT_PREFIX = {
  // # comment languages
  python: '#',
  py: '#',
  ruby: '#',
  rb: '#',
  bash: '#',
  sh: '#',
  yaml: '#',
  yml: '#',
  toml: '#',
  r: '#',
  perl: '#',
  pl: '#',
  elixir: '#',
  ex: '#',
  exs: '#',
  powershell: '#',
  ps1: '#',
  dockerfile: '#',
  docker: '#',
  makefile: '#',
  make: '#',
  julia: '#',
  jl: '#',
  nim: '#',
  crystal: '#',
  cr: '#',
  coffeescript: '#',
  coffee: '#',
  tcl: '#',

  // // comment languages
  js: '//',
  javascript: '//',
  mjs: '//',
  cjs: '//',
  jsx: '//',
  ts: '//',
  typescript: '//',
  tsx: '//',
  rust: '//',
  rs: '//',
  go: '//',
  java: '//',
  c: '//',
  cpp: '//',
  'c++': '//',
  csharp: '//',
  cs: '//',
  kotlin: '//',
  kt: '//',
  swift: '//',
  dart: '//',
  scala: '//',
  groovy: '//',
  php: '//',
  zig: '//',
  objc: '//',
  'objective-c': '//',
  objectivec: '//',
  fsharp: '//',
  fs: '//',
  d: '//',
  solidity: '//',
  sol: '//',
  protobuf: '//',
  proto: '//',

  // -- comment languages
  sql: '--',
  lua: '--',
  haskell: '--',
  hs: '--',
  elm: '--',
  ada: '--',
  vhdl: '--',

  // % comment languages
  matlab: '%',
  erlang: '%',
  erl: '%',
  prolog: '%',
  latex: '%',
  tex: '%',

  // ; comment languages
  clojure: ';',
  clj: ';',
  lisp: ';',
  commonlisp: ';',
  scheme: ';',
  asm: ';',
  assembly: ';',
  nasm: ';',

  // REM comment languages
  bat: 'REM',
  batch: 'REM',
  cmd: 'REM',
};

/**
 * Transmute rule presets — transform test assertions into readable output comments.
 *
 * Each rule has:
 *   match    — regex with named capture groups (subject, value, op)
 *   template — replacement string ($COMMENT, $<name> refs)
 *
 * Import individual groups to compose a custom transmute list.
 */
export const PRESET_TRANSMUTE = {
  python: [
    // assert subject == value  →  # subject => value
    // Trailing comment: only match # preceded by 2+ spaces (PEP 8 convention)
    // Assert message: stop value capture at ", " followed by a quote (assert expr, "msg")
    {
      match:
        /^\s*assert\s+(?<subject>.+?)\s*==\s*(?<value>.+?)(?:,\s*["'f].*)?(?:\s{2,}#.*)?$/,
      template: '$COMMENT $<subject> => $<value>',
    },
    // assert subject != value  →  # subject != value
    {
      match:
        /^\s*assert\s+(?<subject>.+?)\s*!=\s*(?<value>.+?)(?:,\s*["'f].*)?(?:\s{2,}#.*)?$/,
      template: '$COMMENT $<subject> != $<value>',
    },
    // assert subject is not value  →  # subject is not value
    {
      match:
        /^\s*assert\s+(?<subject>\S+)\s+is\s+not\s+(?<value>.+?)(?:\s{2,}#.*)?$/,
      template: '$COMMENT $<subject> is not $<value>',
    },
    // assert subject is value  →  # subject => value
    {
      match: /^\s*assert\s+(?<subject>\S+)\s+is\s+(?<value>.+?)(?:\s{2,}#.*)?$/,
      template: '$COMMENT $<subject> => $<value>',
    },
    // assert subject  (bare truthiness, reject lines ending with open paren)
    // Subject: starts with non-#/space/paren, optionally extends with non-# chars
    {
      match:
        /^\s*assert\s+(?<subject>[^#(\s](?:[^#]*[^#(\s])?)\s*(?:\s{2,}#.*)?$/,
      template: '$COMMENT $<subject> => (truthy)',
    },
  ],
  js: [
    // expect(subject).toBe(value)
    {
      match:
        /^\s*expect\((?<subject>.+?)\)\.toBe\((?<value>.+?)\)\s*;?\s*(?:\/\/.*)?$/,
      template: '$COMMENT $<subject> => $<value>',
    },
    // expect(subject).toEqual(value)
    {
      match:
        /^\s*expect\((?<subject>.+?)\)\.toEqual\((?<value>.+?)\)\s*;?\s*(?:\/\/.*)?$/,
      template: '$COMMENT $<subject> => $<value>',
    },
    // expect(subject).toStrictEqual(value)
    {
      match:
        /^\s*expect\((?<subject>.+?)\)\.toStrictEqual\((?<value>.+?)\)\s*;?\s*(?:\/\/.*)?$/,
      template: '$COMMENT $<subject> => $<value>',
    },
    // expect(subject).not.toBe(value)  →  // subject !== value
    {
      match:
        /^\s*expect\((?<subject>.+?)\)\.not\.toBe\((?<value>.+?)\)\s*;?\s*(?:\/\/.*)?$/,
      template: '$COMMENT $<subject> !== $<value>',
    },
    // expect(subject).toBeTruthy()
    {
      match:
        /^\s*expect\((?<subject>.+?)\)\.toBeTruthy\(\)\s*;?\s*(?:\/\/.*)?$/,
      template: '$COMMENT $<subject> => (truthy)',
    },
    // expect(subject).toBeFalsy()
    {
      match: /^\s*expect\((?<subject>.+?)\)\.toBeFalsy\(\)\s*;?\s*(?:\/\/.*)?$/,
      template: '$COMMENT $<subject> => (falsy)',
    },
    // expect(subject).toBeNull()
    {
      match: /^\s*expect\((?<subject>.+?)\)\.toBeNull\(\)\s*;?\s*(?:\/\/.*)?$/,
      template: '$COMMENT $<subject> => null',
    },
    // expect(subject).toBeUndefined()
    {
      match:
        /^\s*expect\((?<subject>.+?)\)\.toBeUndefined\(\)\s*;?\s*(?:\/\/.*)?$/,
      template: '$COMMENT $<subject> => undefined',
    },
    // expect(subject).toHaveLength(value)
    {
      match:
        /^\s*expect\((?<subject>.+?)\)\.toHaveLength\((?<value>.+?)\)\s*;?\s*(?:\/\/.*)?$/,
      template: '$COMMENT $<subject>.length => $<value>',
    },
    // expect(subject).toContain(value)
    {
      match:
        /^\s*expect\((?<subject>.+?)\)\.toContain\((?<value>.+?)\)\s*;?\s*(?:\/\/.*)?$/,
      template: '$COMMENT $<subject> contains $<value>',
    },
  ],
  rust: [
    // assert_eq!(subject, value) — uses argMap for correct comma splitting
    {
      match: /^\s*assert_eq!\((?<inner>.+)\)\s*;?\s*(?:\/\/.*)?$/,
      argMap: { subject: 0, value: 1 },
      template: '$COMMENT $<subject> => $<value>',
    },
    // assert_ne!(subject, value)
    {
      match: /^\s*assert_ne!\((?<inner>.+)\)\s*;?\s*(?:\/\/.*)?$/,
      argMap: { subject: 0, value: 1 },
      template: '$COMMENT $<subject> != $<value>',
    },
    // assert!(subject) — single arg, no argMap needed
    {
      match: /^\s*assert!\((?<subject>.+?)\)\s*;?\s*(?:\/\/.*)?$/,
      template: '$COMMENT $<subject> => true',
    },
  ],
  java: [
    // assertEquals(expected, actual) — JUnit: expected first, actual second
    {
      match: /^\s*assertEquals\((?<inner>.+)\)\s*;?\s*(?:\/\/.*)?$/,
      argMap: { value: 0, subject: 1 },
      template: '$COMMENT $<subject> => $<value>',
    },
    // assertNotEquals(unexpected, actual)
    {
      match: /^\s*assertNotEquals\((?<inner>.+)\)\s*;?\s*(?:\/\/.*)?$/,
      argMap: { value: 0, subject: 1 },
      template: '$COMMENT $<subject> != $<value>',
    },
    // assertTrue(subject) — single arg
    {
      match: /^\s*assertTrue\((?<subject>.+?)\)\s*;?\s*(?:\/\/.*)?$/,
      template: '$COMMENT $<subject> => true',
    },
    // assertFalse(subject)
    {
      match: /^\s*assertFalse\((?<subject>.+?)\)\s*;?\s*(?:\/\/.*)?$/,
      template: '$COMMENT $<subject> => false',
    },
    // assertNull(subject)
    {
      match: /^\s*assertNull\((?<subject>.+?)\)\s*;?\s*(?:\/\/.*)?$/,
      template: '$COMMENT $<subject> => null',
    },
    // assertNotNull(subject)
    {
      match: /^\s*assertNotNull\((?<subject>.+?)\)\s*;?\s*(?:\/\/.*)?$/,
      template: '$COMMENT $<subject> != null',
    },
  ],
  go: [
    // assert.Equal(t, expected, actual) — 3 args: skip first (t), value=1, subject=2
    {
      match: /^\s*assert\.Equal\((?<inner>.+)\)\s*(?:\/\/.*)?$/,
      argMap: { value: 1, subject: 2 },
      template: '$COMMENT $<subject> => $<value>',
    },
    // assert.NotEqual(t, unexpected, actual)
    {
      match: /^\s*assert\.NotEqual\((?<inner>.+)\)\s*(?:\/\/.*)?$/,
      argMap: { value: 1, subject: 2 },
      template: '$COMMENT $<subject> != $<value>',
    },
    // assert.Nil(t, subject) — 2 args: skip first (t), subject=1
    {
      match: /^\s*assert\.Nil\((?<inner>.+)\)\s*(?:\/\/.*)?$/,
      argMap: { subject: 1 },
      template: '$COMMENT $<subject> => nil',
    },
    // assert.NotNil(t, subject)
    {
      match: /^\s*assert\.NotNil\((?<inner>.+)\)\s*(?:\/\/.*)?$/,
      argMap: { subject: 1 },
      template: '$COMMENT $<subject> != nil',
    },
    // assert.True(t, subject)
    {
      match: /^\s*assert\.True\((?<inner>.+)\)\s*(?:\/\/.*)?$/,
      argMap: { subject: 1 },
      template: '$COMMENT $<subject> => true',
    },
  ],
  cpp: [
    // ASSERT_EQ / EXPECT_EQ(subject, value)
    {
      match: /^\s*(?:ASSERT|EXPECT)_EQ\((?<inner>.+)\)\s*;?\s*(?:\/\/.*)?$/,
      argMap: { subject: 0, value: 1 },
      template: '$COMMENT $<subject> => $<value>',
    },
    // ASSERT_NE / EXPECT_NE(subject, value)
    {
      match: /^\s*(?:ASSERT|EXPECT)_NE\((?<inner>.+)\)\s*;?\s*(?:\/\/.*)?$/,
      argMap: { subject: 0, value: 1 },
      template: '$COMMENT $<subject> != $<value>',
    },
    // ASSERT_TRUE / EXPECT_TRUE(subject) — single arg, no argMap
    {
      match:
        /^\s*(?:ASSERT|EXPECT)_TRUE\((?<subject>.+?)\)\s*;?\s*(?:\/\/.*)?$/,
      template: '$COMMENT $<subject> => true',
    },
    // ASSERT_FALSE / EXPECT_FALSE(subject)
    {
      match:
        /^\s*(?:ASSERT|EXPECT)_FALSE\((?<subject>.+?)\)\s*;?\s*(?:\/\/.*)?$/,
      template: '$COMMENT $<subject> => false',
    },
  ],
};

/**
 * All transmute rules combined — use when you want to transmute every language.
 * Unlike DEFAULT_STRIP_PATTERNS, transmutation is opt-in; this is only used when
 * explicitly referenced.
 */
export const DEFAULT_TRANSMUTE_RULES = [
  ...PRESET_TRANSMUTE.python,
  ...PRESET_TRANSMUTE.js,
  ...PRESET_TRANSMUTE.rust,
  ...PRESET_TRANSMUTE.java,
  ...PRESET_TRANSMUTE.go,
  ...PRESET_TRANSMUTE.cpp,
];
