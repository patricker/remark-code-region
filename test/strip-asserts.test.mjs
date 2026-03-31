import { describe, it, expect } from 'vitest';
import { stripAsserts, cleanCode } from '../lib/strip-asserts.mjs';
import { DEFAULT_STRIP_PATTERNS } from '../lib/patterns.mjs';

describe('stripAsserts', () => {
  // stripAsserts removes matching lines — no blank line remains

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
    const code = 'int x = 1;\nASSERT_EQ(x, 1);\nEXPECT_TRUE(x > 0);\nstd::cout << x;';
    const result = stripAsserts(code, DEFAULT_STRIP_PATTERNS);
    expect(result).toBe('int x = 1;\nstd::cout << x;');
  });

  it('strips Go error check pattern', () => {
    const code = 'rows, err := ReadAll(text)\nif err != nil { t.Fatal(err) }\nfmt.Println(rows)';
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

describe('cleanCode', () => {
  it('strips asserts and collapses blank lines', () => {
    const code = 'x = 1\nassert x == 1\n\n\n\nprint(x)';
    const result = cleanCode(code, { patterns: DEFAULT_STRIP_PATTERNS });
    expect(result).toBe('x = 1\n\nprint(x)');
  });

  it('respects keepAsserts', () => {
    const code = 'x = 1\nassert x == 1';
    const result = cleanCode(code, { keepAsserts: true, patterns: DEFAULT_STRIP_PATTERNS });
    expect(result).toBe('x = 1\nassert x == 1');
  });

  it('trims leading and trailing whitespace', () => {
    // trim() removes leading whitespace from the whole string
    const code = '\n\nx = 1\ny = 2\n\n';
    const result = cleanCode(code, { patterns: DEFAULT_STRIP_PATTERNS });
    expect(result).toBe('x = 1\ny = 2');
  });
});
