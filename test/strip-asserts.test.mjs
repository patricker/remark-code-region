import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STRIP_PATTERNS,
  PRESET_STRIP,
  PRESET_TRANSMUTE,
} from '../lib/patterns.mjs';
import {
  cleanCode,
  dedent,
  splitArgs,
  stripAsserts,
  transmuteAsserts,
} from '../lib/strip-asserts.mjs';

describe('stripAsserts', () => {
  it('strips Python assert', () => {
    const code = 'x = 1\nassert x == 1\nprint(x)';
    const result = stripAsserts(code, DEFAULT_STRIP_PATTERNS);
    expect(result).toBe('x = 1\nprint(x)');
  });

  it('strips Rust assert_eq!', () => {
    const code = 'let x = 1;\nassert_eq!(x, 1);\nprintln!("{}", x);';
    const result = stripAsserts(code, DEFAULT_STRIP_PATTERNS);
    expect(result).toBe('let x = 1;\nprintln!("{}", x);');
  });

  it('strips JS expect()', () => {
    const code = 'const x = sum(2, 3);\nexpect(x).toBe(5);\nconsole.log(x);';
    const result = stripAsserts(code, DEFAULT_STRIP_PATTERNS);
    expect(result).toBe('const x = sum(2, 3);\nconsole.log(x);');
  });

  it('strips Java assertEquals', () => {
    const code = 'int x = 1;\nassertEquals(1, x);\nSystem.out.println(x);';
    const result = stripAsserts(code, DEFAULT_STRIP_PATTERNS);
    expect(result).toBe('int x = 1;\nSystem.out.println(x);');
  });

  it('strips C++ ASSERT_ and EXPECT_', () => {
    const code =
      'int x = 1;\nASSERT_EQ(x, 1);\nEXPECT_TRUE(x > 0);\nstd::cout << x;';
    const result = stripAsserts(code, DEFAULT_STRIP_PATTERNS);
    expect(result).toBe('int x = 1;\nstd::cout << x;');
  });

  it('strips Go error check pattern', () => {
    const code =
      'rows, err := ReadAll(text)\nif err != nil { t.Fatal(err) }\nfmt.Println(rows)';
    const result = stripAsserts(code, DEFAULT_STRIP_PATTERNS);
    expect(result).toBe('rows, err := ReadAll(text)\nfmt.Println(rows)');
  });

  it('strips test-only comment lines', () => {
    const code = 'x = 1  # test-only\ny = 2\nz = 3  // test-only';
    const result = stripAsserts(code, DEFAULT_STRIP_PATTERNS);
    expect(result).toBe('y = 2');
  });

  it('preserves non-assert lines', () => {
    const code = 'import mhn\nrows = mhn.loads(text)\nprint(rows)';
    const result = stripAsserts(code, DEFAULT_STRIP_PATTERNS);
    expect(result).toBe(code);
  });
});

describe('PRESET_STRIP groups', () => {
  it('python preset strips only Python asserts', () => {
    const code = 'assert x == 1\nexpect(y).toBe(2)\nassert_eq!(z, 3);';
    const result = stripAsserts(code, PRESET_STRIP.python);
    expect(result).toBe('expect(y).toBe(2)\nassert_eq!(z, 3);');
  });

  it('js preset strips only expect()', () => {
    const code = 'assert x == 1\nexpect(y).toBe(2)\nassert_eq!(z, 3);';
    const result = stripAsserts(code, PRESET_STRIP.js);
    expect(result).toBe('assert x == 1\nassert_eq!(z, 3);');
  });

  it('rust preset strips only assert_eq!/assert_ne!', () => {
    const code = 'assert x == 1\nassert_eq!(z, 3);\nassert_ne!(a, b);';
    const result = stripAsserts(code, PRESET_STRIP.rust);
    expect(result).toBe('assert x == 1');
  });

  it('markers preset strips test-only comments', () => {
    const code = 'x = 1  # test-only\ny = 2\nz = 3  // test-only';
    const result = stripAsserts(code, PRESET_STRIP.markers);
    expect(result).toBe('y = 2');
  });

  it('DEFAULT_STRIP_PATTERNS is the union of all presets', () => {
    const presetTotal = Object.values(PRESET_STRIP).flat().length;
    expect(DEFAULT_STRIP_PATTERNS.length).toBe(presetTotal);
  });
});

describe('dedent', () => {
  it('removes common leading whitespace', () => {
    const code = '    x = 1\n    y = 2\n    z = 3';
    expect(dedent(code)).toBe('x = 1\ny = 2\nz = 3');
  });

  it('preserves relative indentation', () => {
    const code = '        def foo():\n            return 1';
    expect(dedent(code)).toBe('def foo():\n    return 1');
  });

  it('handles mixed indent with blank lines', () => {
    const code = '    line1\n\n    line3\n        line4';
    expect(dedent(code)).toBe('line1\n\nline3\n    line4');
  });

  it('returns code unchanged if no common indent', () => {
    const code = 'x = 1\n  y = 2';
    expect(dedent(code)).toBe('x = 1\n  y = 2');
  });

  it('handles all-empty input', () => {
    expect(dedent('')).toBe('');
    expect(dedent('\n\n')).toBe('\n\n');
  });
});

describe('cleanCode', () => {
  it('strips asserts, dedents, and collapses blank lines', () => {
    const code = '    x = 1\n    assert x == 1\n\n\n\n    print(x)';
    const result = cleanCode(code, { patterns: DEFAULT_STRIP_PATTERNS });
    expect(result).toBe('x = 1\n\nprint(x)');
  });

  it('respects noStrip', () => {
    const code = '    x = 1\n    assert x == 1';
    const result = cleanCode(code, {
      noStrip: true,
      patterns: DEFAULT_STRIP_PATTERNS,
    });
    expect(result).toBe('x = 1\nassert x == 1');
  });

  it('trims leading and trailing whitespace', () => {
    const code = '\n\nx = 1\ny = 2\n\n';
    const result = cleanCode(code, { patterns: DEFAULT_STRIP_PATTERNS });
    expect(result).toBe('x = 1\ny = 2');
  });

  it('dedents even without stripping', () => {
    const code = '    hello\n    world';
    const result = cleanCode(code, { noStrip: true, patterns: [] });
    expect(result).toBe('hello\nworld');
  });

  it('runs transmute before strip', () => {
    const code = 'x = 1\nassert x == 1\nassert y  # test-only';
    const result = cleanCode(code, {
      patterns: DEFAULT_STRIP_PATTERNS,
      transmuteRules: PRESET_TRANSMUTE.python,
      lang: 'python',
    });
    // assert x == 1 is transmuted to a comment
    expect(result).toContain('# x => 1');
    // assert y  # test-only: the "  # test-only" is a trailing comment
    // (2+ spaces before #). The bare-truthiness regex captures just "y".
    expect(result).toContain('# y => (truthy)');
    // Original assert lines are gone
    expect(result).not.toContain('assert x');
    expect(result).not.toContain('assert y');
  });

  it('respects noTransmute', () => {
    const code = 'x = 1\nassert x == 1';
    const result = cleanCode(code, {
      noTransmute: true,
      patterns: DEFAULT_STRIP_PATTERNS,
      transmuteRules: PRESET_TRANSMUTE.python,
      lang: 'python',
    });
    // Transmute disabled, assert stripped instead
    expect(result).not.toContain('assert');
    expect(result).not.toContain('=>');
    expect(result).toBe('x = 1');
  });

  it('transmute active + strip: false — assertions transmuted, nothing stripped', () => {
    const code = 'x = 1\nassert x == 1\nsetup()  # test-only';
    const result = cleanCode(code, {
      noStrip: true,
      patterns: DEFAULT_STRIP_PATTERNS,
      transmuteRules: PRESET_TRANSMUTE.python,
      lang: 'python',
    });
    // Assertion transmuted
    expect(result).toContain('# x => 1');
    // test-only line NOT stripped (strip disabled)
    expect(result).toContain('# test-only');
  });

  it('transmute active + clean: false — transmuted but no whitespace cleanup', () => {
    const code = '    x = 1\n    assert x == 1';
    const result = cleanCode(code, {
      patterns: [],
      transmuteRules: PRESET_TRANSMUTE.python,
      lang: 'python',
      clean: [],
    });
    // Assertion transmuted, indentation preserved (no dedent, no trim)
    expect(result).toBe('    x = 1\n    # x => 1');
  });

  it('noTransmute + noStrip — assertions pass through unchanged', () => {
    const code = 'x = 1\nassert x == 1';
    const result = cleanCode(code, {
      noTransmute: true,
      noStrip: true,
      patterns: DEFAULT_STRIP_PATTERNS,
      transmuteRules: PRESET_TRANSMUTE.python,
      lang: 'python',
    });
    // Neither transmuted nor stripped
    expect(result).toContain('assert x == 1');
    expect(result).not.toContain('=>');
  });

  it('transmute: false (explicit) behaves like undefined', () => {
    const code = 'x = 1\nassert x == 1';
    // transmuteRules=[] simulates transmute:false from index.mjs
    const result = cleanCode(code, {
      patterns: DEFAULT_STRIP_PATTERNS,
      transmuteRules: [],
      lang: 'python',
    });
    // No transmutation, assert stripped by default
    expect(result).not.toContain('=>');
    expect(result).not.toContain('assert');
    expect(result).toBe('x = 1');
  });
});

describe('transmuteAsserts', () => {
  it('Python: equality', () => {
    const code = 'assert user["name"] == "Alice"';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.python, 'python');
    expect(result).toBe('# user["name"] => "Alice"');
  });

  it('Python: inequality', () => {
    const code = 'assert x != 0';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.python, 'python');
    expect(result).toBe('# x != 0');
  });

  it('Python: bare truthiness', () => {
    const code = 'assert response';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.python, 'python');
    expect(result).toBe('# response => (truthy)');
  });

  it('Python: is None', () => {
    const code = 'assert x is None';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.python, 'python');
    expect(result).toBe('# x => None');
  });

  it('Python: is not None', () => {
    const code = 'assert x is not None';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.python, 'python');
    expect(result).toBe('# x is not None');
  });

  it('Python: preserves indentation', () => {
    const code = '        assert result == 4';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.python, 'python');
    expect(result).toBe('        # result => 4');
  });

  it('Python: strips trailing comments', () => {
    const code = 'assert result == 4  # test-only';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.python, 'python');
    expect(result).toBe('# result => 4');
  });

  it('Python: does not transmute multi-line assert opening', () => {
    const code = 'assert (';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.python, 'python');
    // Should pass through unchanged (rejected by the bare truthiness regex)
    expect(result).toBe('assert (');
  });

  it('JS: toBe', () => {
    const code = 'expect(sum(2, 3)).toBe(5);';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.js, 'js');
    expect(result).toBe('// sum(2, 3) => 5');
  });

  it('JS: toEqual', () => {
    const code = 'expect(user.name).toEqual("Alice");';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.js, 'js');
    expect(result).toBe('// user.name => "Alice"');
  });

  it('JS: toBeTruthy', () => {
    const code = 'expect(result).toBeTruthy();';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.js, 'js');
    expect(result).toBe('// result => (truthy)');
  });

  it('JS: not.toBe', () => {
    const code = 'expect(x).not.toBe(0);';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.js, 'js');
    expect(result).toBe('// x !== 0');
  });

  it('JS: toHaveLength', () => {
    const code = 'expect(arr).toHaveLength(3);';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.js, 'js');
    expect(result).toBe('// arr.length => 3');
  });

  it('Rust: assert_eq!', () => {
    const code = 'assert_eq!(rows.len(), 1);';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.rust, 'rust');
    expect(result).toBe('// rows.len() => 1');
  });

  it('Rust: assert_ne!', () => {
    const code = 'assert_ne!(x, 0);';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.rust, 'rust');
    expect(result).toBe('// x != 0');
  });

  it('Rust: assert!', () => {
    const code = 'assert!(result.is_ok());';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.rust, 'rust');
    expect(result).toBe('// result.is_ok() => true');
  });

  it('Java: assertEquals (expected first)', () => {
    const code = 'assertEquals("Alice", user.getName());';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.java, 'java');
    expect(result).toBe('// user.getName() => "Alice"');
  });

  it('Java: assertTrue', () => {
    const code = 'assertTrue(list.isEmpty());';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.java, 'java');
    expect(result).toBe('// list.isEmpty() => true');
  });

  it('Java: assertNull', () => {
    const code = 'assertNull(response);';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.java, 'java');
    expect(result).toBe('// response => null');
  });

  it('Go: assert.Equal', () => {
    const code = 'assert.Equal(t, 3, len(rows))';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.go, 'go');
    expect(result).toBe('// len(rows) => 3');
  });

  it('Go: assert.Nil', () => {
    const code = 'assert.Nil(t, err)';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.go, 'go');
    expect(result).toBe('// err => nil');
  });

  it('C++: ASSERT_EQ', () => {
    const code = 'ASSERT_EQ(x, 1);';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.cpp, 'cpp');
    expect(result).toBe('// x => 1');
  });

  it('C++: EXPECT_TRUE', () => {
    const code = 'EXPECT_TRUE(x > 0);';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.cpp, 'cpp');
    expect(result).toBe('// x > 0 => true');
  });

  it('C++: ASSERT_NE', () => {
    const code = 'ASSERT_NE(ptr, nullptr);';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.cpp, 'cpp');
    expect(result).toBe('// ptr != nullptr');
  });

  // --- Previously untested rules ---

  it('JS: toStrictEqual', () => {
    const code = 'expect(obj).toStrictEqual({a: 1});';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.js, 'js');
    expect(result).toBe('// obj => {a: 1}');
  });

  it('JS: toBeFalsy', () => {
    const code = 'expect(result).toBeFalsy();';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.js, 'js');
    expect(result).toBe('// result => (falsy)');
  });

  it('JS: toBeNull', () => {
    const code = 'expect(response).toBeNull();';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.js, 'js');
    expect(result).toBe('// response => null');
  });

  it('JS: toBeUndefined', () => {
    const code = 'expect(result).toBeUndefined();';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.js, 'js');
    expect(result).toBe('// result => undefined');
  });

  it('JS: toContain', () => {
    const code = 'expect(list).toContain("Alice");';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.js, 'js');
    expect(result).toBe('// list contains "Alice"');
  });

  it('Java: assertNotEquals (parameter order)', () => {
    const code = 'assertNotEquals(0, result);';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.java, 'java');
    expect(result).toBe('// result != 0');
  });

  it('Java: assertFalse', () => {
    const code = 'assertFalse(list.isEmpty());';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.java, 'java');
    expect(result).toBe('// list.isEmpty() => false');
  });

  it('Java: assertNotNull', () => {
    const code = 'assertNotNull(session);';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.java, 'java');
    expect(result).toBe('// session != null');
  });

  it('Go: assert.NotEqual (parameter order)', () => {
    const code = 'assert.NotEqual(t, 0, result)';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.go, 'go');
    expect(result).toBe('// result != 0');
  });

  it('Go: assert.NotNil', () => {
    const code = 'assert.NotNil(t, conn)';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.go, 'go');
    expect(result).toBe('// conn != nil');
  });

  it('Go: assert.True', () => {
    const code = 'assert.True(t, ok)';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.go, 'go');
    expect(result).toBe('// ok => true');
  });

  it('Go: works with non-t receiver variable', () => {
    const code = 'assert.Equal(s, 3, len(rows))';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.go, 'go');
    expect(result).toBe('// len(rows) => 3');
  });

  it('C++: EXPECT_EQ variant', () => {
    const code = 'EXPECT_EQ(x, 42);';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.cpp, 'cpp');
    expect(result).toBe('// x => 42');
  });

  it('C++: ASSERT_FALSE', () => {
    const code = 'ASSERT_FALSE(list.empty());';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.cpp, 'cpp');
    expect(result).toBe('// list.empty() => false');
  });

  it('C++: EXPECT_NE', () => {
    const code = 'EXPECT_NE(ptr, nullptr);';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.cpp, 'cpp');
    expect(result).toBe('// ptr != nullptr');
  });

  // --- Edge cases ---

  it('Python: hash in string value is preserved', () => {
    const code = 'assert color == "#ff0000"';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.python, 'python');
    expect(result).toBe('# color => "#ff0000"');
  });

  it('Python: assert with message stops at message', () => {
    const code = 'assert x == 1, "expected one"';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.python, 'python');
    expect(result).toBe('# x => 1');
  });

  it('Python: single-char subject works', () => {
    const code = 'assert x';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.python, 'python');
    expect(result).toBe('# x => (truthy)');
  });

  it('Python: bare truthiness with trailing comment', () => {
    const code = 'assert response  # should exist';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.python, 'python');
    expect(result).toBe('# response => (truthy)');
  });

  it('case-insensitive lang lookup', () => {
    const code = 'assert x == 1';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.python, 'Python');
    expect(result).toBe('# x => 1');
  });

  it('non-matching lines pass through unchanged', () => {
    const code = 'x = 1\nprint(x)';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.python, 'python');
    expect(result).toBe('x = 1\nprint(x)');
  });

  it('$COMMENT resolves to # for python', () => {
    const code = 'assert x == 1';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.python, 'python');
    expect(result).toMatch(/^#/);
  });

  it('$COMMENT resolves to // for unknown language', () => {
    const code = 'assert x == 1';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.python, 'foobar');
    expect(result).toMatch(/^\/\//);
  });

  it('$COMMENT resolves to -- for sql', () => {
    // Verifying the expanded COMMENT_PREFIX map
    const code = 'assert x == 1';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.python, 'sql');
    expect(result).toMatch(/^--/);
  });

  it('$COMMENT resolves to % for matlab', () => {
    const code = 'assert x == 1';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.python, 'matlab');
    expect(result).toMatch(/^%/);
  });

  it('$COMMENT resolves to ; for clojure', () => {
    const code = 'assert x == 1';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.python, 'clojure');
    expect(result).toMatch(/^;/);
  });

  // --- Nested comma handling (argMap + splitArgs) ---

  it('Rust: nested commas in subject', () => {
    const code = 'assert_eq!(add(1, 2), 3);';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.rust, 'rust');
    expect(result).toBe('// add(1, 2) => 3');
  });

  it('Rust: nested commas in both args', () => {
    const code = 'assert_eq!(foo(1, 2), bar(3, 4));';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.rust, 'rust');
    expect(result).toBe('// foo(1, 2) => bar(3, 4)');
  });

  it('Java: string with comma in expected value', () => {
    const code = 'assertEquals("hello, world", result);';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.java, 'java');
    expect(result).toBe('// result => "hello, world"');
  });

  it('Java: function call in actual value', () => {
    const code = 'assertEquals(42, compute(a, b));';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.java, 'java');
    expect(result).toBe('// compute(a, b) => 42');
  });

  it('Go: nested commas in actual value', () => {
    const code = 'assert.Equal(t, 42, compute(a, b))';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.go, 'go');
    expect(result).toBe('// compute(a, b) => 42');
  });

  it('Go: string with comma in expected value', () => {
    const code = 'assert.Equal(t, "hello, world", result)';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.go, 'go');
    expect(result).toBe('// result => "hello, world"');
  });

  it('C++: nested function call in subject', () => {
    const code = 'ASSERT_EQ(fn(1, 2), 42);';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.cpp, 'cpp');
    expect(result).toBe('// fn(1, 2) => 42');
  });

  it('C++: collection literal with commas', () => {
    const code = 'EXPECT_EQ(vec.size(), 3);';
    const result = transmuteAsserts(code, PRESET_TRANSMUTE.cpp, 'cpp');
    expect(result).toBe('// vec.size() => 3');
  });
});

describe('splitArgs', () => {
  it('simple two args', () => {
    expect(splitArgs('x, 1')).toEqual(['x', '1']);
  });

  it('nested parens in first arg', () => {
    expect(splitArgs('add(1, 2), 3')).toEqual(['add(1, 2)', '3']);
  });

  it('nested parens in both args', () => {
    expect(splitArgs('add(1, 2), sub(3, 4)')).toEqual([
      'add(1, 2)',
      'sub(3, 4)',
    ]);
  });

  it('deeply nested', () => {
    expect(splitArgs('f(g(a, b), c), d')).toEqual(['f(g(a, b), c)', 'd']);
  });

  it('string with comma (double quotes)', () => {
    expect(splitArgs('"hello, world", result')).toEqual([
      '"hello, world"',
      'result',
    ]);
  });

  it('string with comma (single quotes)', () => {
    expect(splitArgs("result, 'hello, world'")).toEqual([
      'result',
      "'hello, world'",
    ]);
  });

  it('three args', () => {
    expect(splitArgs('t, 3, len(rows)')).toEqual(['t', '3', 'len(rows)']);
  });

  it('brackets and braces', () => {
    expect(splitArgs('arr[0, 1], 5')).toEqual(['arr[0, 1]', '5']);
    expect(splitArgs('{a: 1, b: 2}, expected')).toEqual([
      '{a: 1, b: 2}',
      'expected',
    ]);
  });

  it('single arg (no comma)', () => {
    expect(splitArgs('result.is_ok()')).toEqual(['result.is_ok()']);
  });

  it('mixed nesting', () => {
    expect(splitArgs('fn({a: [1, 2]}, "x, y"), z')).toEqual([
      'fn({a: [1, 2]}, "x, y")',
      'z',
    ]);
  });

  it('empty string', () => {
    expect(splitArgs('')).toEqual([]);
  });
});
