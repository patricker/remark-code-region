import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { remark } from 'remark';
import { describe, expect, it } from 'vitest';
import remarkCodeRegion, { PRESET_CLEAN, PRESET_STRIP } from '../index.mjs';
import { DEFAULT_REGION_MARKERS, PRESET_MARKERS } from '../lib/patterns.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

function process(markdown, options = {}) {
  const opts = { rootDir: fixturesDir, ...options };
  return remark()
    .use(remarkCodeRegion, opts)
    .processSync(markdown)
    .toString()
    .trim();
}

/** Process with a virtual markdown file path so file.dirname is available for file= resolution. */
function processWithPath(markdown, mdPath, options = {}) {
  const opts = { rootDir: fixturesDir, ...options };
  return remark()
    .use(remarkCodeRegion, opts)
    .processSync({ value: markdown, path: mdPath })
    .toString()
    .trim();
}

// Virtual markdown path inside fixturesDir for file= tests
const mdPath = path.join(fixturesDir, 'page.md');

describe('remarkCodeRegion — core', () => {
  it('injects a Python region', () => {
    const input = '```python reference="snippets/example.py#hello"\n```';
    const output = process(input);
    expect(output).toContain('name = "World"');
    expect(output).toContain('print(f"Hello, {name}!")');
  });

  it('strips assert lines by default', () => {
    const input = '```python reference="snippets/example.py#with_asserts"\n```';
    const output = process(input);
    expect(output).toContain('result = 2 + 2');
    expect(output).toContain('print(result)');
    expect(output).not.toContain('assert result == 4');
    expect(output).not.toContain('assert type(result)');
  });

  it('keeps asserts with ?noStrip', () => {
    const input =
      '```python reference="snippets/example.py#with_asserts?noStrip"\n```';
    const output = process(input);
    expect(output).toContain('assert result == 4');
  });

  it('strips JS expect() lines', () => {
    const input = '```js reference="snippets/example.js#with_expects"\n```';
    const output = process(input);
    expect(output).toContain('const sum = (a, b) => a + b;');
    expect(output).toContain('console.log(sum(2, 3));');
    expect(output).not.toContain('expect(');
  });

  it('strips Rust assert_eq! lines', () => {
    const input = '```rust reference="snippets/example.rs#with_asserts"\n```';
    const output = process(input);
    expect(output).toContain('let rows = read_all');
    expect(output).not.toContain('assert_eq!');
  });

  it('injects full file when no region specified', () => {
    const input = '```python reference="snippets/example.py"\n```';
    const output = process(input);
    expect(output).toContain('name = "World"');
    expect(output).toContain('def greet');
  });

  it('removes reference attribute from meta', () => {
    const input =
      '```python title="example" reference="snippets/example.py#hello"\n```';
    const output = process(input);
    expect(output).not.toContain('reference=');
    expect(output).toContain('title="example"');
  });

  it('ignores code blocks without reference attribute', () => {
    const input = '```python\nprint("hello")\n```';
    const output = process(input);
    expect(output).toContain('print("hello")');
  });
});

describe('remarkCodeRegion — errors', () => {
  it('throws on missing file', () => {
    const input = '```python reference="snippets/nonexistent.py#hello"\n```';
    expect(() => process(input)).toThrow('cannot read file');
  });

  it('throws on missing region', () => {
    const input = '```python reference="snippets/example.py#nope"\n```';
    expect(() => process(input)).toThrow("region 'nope' not found");
  });

  it('throws on unclosed region', () => {
    const input = '```python reference="snippets/unclosed.py#oops"\n```';
    expect(() => process(input)).toThrow('was opened but never closed');
  });
});

describe('remarkCodeRegion — auto-dedent', () => {
  it('removes common leading whitespace from indented regions', () => {
    const input = '```python reference="snippets/indented.py#create_user"\n```';
    const output = process(input);
    // The region is indented 8 spaces in the source (inside class + method).
    // After dedent, code should start at column 0.
    expect(output).toContain('from myapp import client');
    expect(output).not.toMatch(/^ {8}from myapp/m);
    expect(output).toMatch(/^from myapp/m);
  });
});

describe('remarkCodeRegion — security', () => {
  it('blocks references outside root directory', () => {
    const input = '```python reference="../../../etc/passwd#foo"\n```';
    expect(() => process(input)).toThrow('resolves outside the root directory');
  });

  it('allows outside references when allowOutsideRoot is true', () => {
    // Reference a file outside the fixtures root (go up two levels to project README)
    const input = '```markdown reference="../../README.md"\n```';
    // Without allowOutsideRoot, this would throw
    expect(() => process(input)).toThrow('resolves outside the root directory');
    // With allowOutsideRoot, it should succeed
    const output = process(input, { allowOutsideRoot: true });
    expect(output).toContain('remark-code-region');
  });
});

describe('remarkCodeRegion — strip option', () => {
  it('uses defaults when strip is undefined', () => {
    const input = '```python reference="snippets/example.py#with_asserts"\n```';
    const output = process(input);
    expect(output).not.toContain('assert');
  });

  it('disables stripping when strip is false', () => {
    const input = '```python reference="snippets/example.py#with_asserts"\n```';
    const output = process(input, { strip: false });
    expect(output).toContain('assert result == 4');
  });

  it('uses custom patterns when strip is an array', () => {
    const input = '```python reference="snippets/example.py#with_asserts"\n```';
    // Only strip "assert type" lines, keep "assert result"
    const output = process(input, { strip: [/^\s*assert type/] });
    expect(output).toContain('assert result == 4');
    expect(output).not.toContain('assert type(result)');
  });

  it('PRESET_STRIP groups can be composed', () => {
    const input = '```python reference="snippets/example.py#with_asserts"\n```';
    const output = process(input, {
      strip: [...PRESET_STRIP.python, ...PRESET_STRIP.markers],
    });
    expect(output).not.toContain('assert result');
    expect(output).toContain('result = 2 + 2');
  });

  it('PRESET_STRIP.js strips expect() when used alone', () => {
    const input = '```js reference="snippets/example.js#with_expects"\n```';
    const output = process(input, { strip: [...PRESET_STRIP.js] });
    expect(output).not.toContain('expect(');
    expect(output).toContain('console.log');
  });
});

describe('remarkCodeRegion — ?noStrip query parsing', () => {
  it('parses ?noStrip flag', () => {
    const input =
      '```python reference="snippets/example.py#with_asserts?noStrip"\n```';
    const output = process(input);
    expect(output).toContain('assert result == 4');
  });

  it('handles multiple flags', () => {
    const input =
      '```python reference="snippets/example.py#with_asserts?noStrip&future"\n```';
    const output = process(input);
    expect(output).toContain('assert result == 4');
  });

  it('does not mangle paths without flags', () => {
    const input = '```python reference="snippets/example.py#hello"\n```';
    const output = process(input);
    expect(output).toContain('name = "World"');
  });
});

describe('remarkCodeRegion — custom region markers', () => {
  const opts = {
    regionMarkers: [
      {
        start: /^[ \t]*#\s*region:\s*(\S+)\s*$/,
        end: /^[ \t]*#\s*endregion:\s*(\S+)\s*$/,
      },
      {
        start: /^[ \t]*\/\/\s*region:\s*(\S+)\s*$/,
        end: /^[ \t]*\/\/\s*endregion:\s*(\S+)\s*$/,
      },
      PRESET_MARKERS.css,
    ],
  };

  it('injects a CSS region', () => {
    const input = '```css reference="snippets/example.css#button_styles"\n```';
    const output = process(input, opts);
    expect(output).toContain('.btn {');
    expect(output).toContain('background: #3b82f6;');
  });

  it('extracts only the requested CSS region', () => {
    const input = '```css reference="snippets/example.css#dark_theme"\n```';
    const output = process(input, opts);
    expect(output).toContain("data-theme='dark'");
    expect(output).not.toContain('padding: 0.5rem');
  });
});

describe('remarkCodeRegion — SQL + HTML markers', () => {
  const opts = {
    regionMarkers: [
      {
        start: /^[ \t]*#\s*region:\s*(\S+)\s*$/,
        end: /^[ \t]*#\s*endregion:\s*(\S+)\s*$/,
      },
      {
        start: /^[ \t]*\/\/\s*region:\s*(\S+)\s*$/,
        end: /^[ \t]*\/\/\s*endregion:\s*(\S+)\s*$/,
      },
      PRESET_MARKERS.sql,
      PRESET_MARKERS.html,
    ],
  };

  it('injects a SQL region', () => {
    const input = '```sql reference="snippets/example.sql#create_table"\n```';
    const output = process(input, opts);
    expect(output).toContain('CREATE TABLE users');
  });

  it('injects an HTML region', () => {
    const input = '```html reference="snippets/example.html#nav_bar"\n```';
    const output = process(input, opts);
    expect(output).toContain('<nav class="navbar">');
  });
});

// ─── multi-region tests ────────────────────────────────────────────────

describe('remarkCodeRegion — multi-region', () => {
  it('concatenates two named regions with blank line separator', () => {
    const input =
      '```python reference="snippets/example.py#hello,with_asserts"\n```';
    const output = process(input);
    // hello region content
    expect(output).toContain('name = "World"');
    // with_asserts region content (asserts stripped by default)
    expect(output).toContain('result = 2 + 2');
    // Both present in one block
    expect(output).toContain('print(f"Hello');
    expect(output).toContain('print(result)');
  });

  it('concatenates a named region and a line range', () => {
    const input = '```python reference="snippets/example.py#hello,L6-L8"\n```';
    const output = process(input);
    // hello region
    expect(output).toContain('name = "World"');
    // Lines 6-8 of example.py (the with_asserts region markers + content)
    expect(output).toContain('result = 2 + 2');
  });

  it('works with file= syntax', () => {
    const input = '```python file=./snippets/example.py#hello,multiline\n```';
    const output = processWithPath(input, mdPath);
    expect(output).toContain('name = "World"');
    expect(output).toContain('def greet(name)');
  });

  it('applies strip to the concatenated result', () => {
    const input =
      '```python reference="snippets/example.py#with_asserts,multiline"\n```';
    const output = process(input);
    // Asserts stripped from both regions
    expect(output).not.toContain('assert result');
    expect(output).not.toContain('assert message');
    // Non-assert lines kept
    expect(output).toContain('result = 2 + 2');
    expect(output).toContain('def greet(name)');
  });

  it('dedents based on minimum indent across all regions', () => {
    // Use indented.py which has 8-space indented content + line range at 0-indent
    // Lines 1-2 of indented.py are "class TestUsers:" and "    def test_create(self):"
    // Region create_user is indented 8 spaces
    // Minimum across both is 0, so the 8-space region stays 8-space
    const input =
      '```python reference="snippets/indented.py#L1-L1,create_user"\n```';
    const output = process(input);
    // Line 1 is at 0-indent
    expect(output).toMatch(/^class TestUsers/m);
    // Region content keeps its 8-space indent relative to the 0-indent line
    expect(output).toContain('from myapp import client');
  });

  it('fails if any region is not found', () => {
    const input =
      '```python reference="snippets/example.py#hello,nonexistent"\n```';
    expect(() => process(input)).toThrow("region 'nonexistent' not found");
  });

  it('fails if any line range is out of bounds', () => {
    const input = '```python reference="snippets/example.py#hello,L999"\n```';
    expect(() => process(input)).toThrow('line 999 is out of range');
  });

  it('respects custom regionSeparator option', () => {
    const input =
      '```python reference="snippets/example.py#hello,with_asserts"\n```';
    const output = process(input, { regionSeparator: '\n' });
    expect(output).toContain('print(f"Hello');
    expect(output).toContain('result = 2 + 2');
  });

  it('single-region fragment is backward compatible', () => {
    const input = '```python reference="snippets/example.py#hello"\n```';
    const output = process(input);
    expect(output).toContain('name = "World"');
    expect(output).toContain('print(f"Hello');
  });

  it('works with ?noStrip at end of fragment list', () => {
    const input =
      '```python reference="snippets/example.py#hello,with_asserts?noStrip"\n```';
    const output = process(input);
    expect(output).toContain('assert result == 4');
  });

  it('concatenates three regions', () => {
    const input =
      '```python reference="snippets/example.py#hello,with_asserts,multiline"\n```';
    const output = process(input);
    expect(output).toContain('name = "World"');
    expect(output).toContain('result = 2 + 2');
    expect(output).toContain('def greet(name)');
  });

  it('trims whitespace around commas in fragment list', () => {
    const input =
      '```python reference="snippets/example.py#hello, with_asserts"\n```';
    const output = process(input);
    expect(output).toContain('name = "World"');
    expect(output).toContain('result = 2 + 2');
  });

  it('ignores trailing comma in fragment list', () => {
    const input = '```python reference="snippets/example.py#hello,"\n```';
    const output = process(input);
    expect(output).toContain('name = "World"');
    expect(output).not.toContain('result = 2 + 2');
  });

  it('ignores leading comma in fragment list', () => {
    const input = '```python reference="snippets/example.py#,hello"\n```';
    const output = process(input);
    expect(output).toContain('name = "World"');
  });

  it('ignores double comma in fragment list', () => {
    const input =
      '```python reference="snippets/example.py#hello,,with_asserts"\n```';
    const output = process(input);
    expect(output).toContain('name = "World"');
    expect(output).toContain('result = 2 + 2');
  });
});

// ─── file= compat tests ───────────────────────────────────────────────

describe('remarkCodeRegion — file= core', () => {
  it('injects full file with file= (no fragment)', () => {
    const input = '```js file=./snippets/say-hi.js\n```';
    const output = processWithPath(input, mdPath);
    expect(output).toContain('function sayHi');
    expect(output).toContain('module.exports = sayHi;');
  });

  it('injects a named region via file=', () => {
    const input = '```python file=./snippets/example.py#hello\n```';
    const output = processWithPath(input, mdPath);
    expect(output).toContain('name = "World"');
    expect(output).toContain('print(f"Hello');
  });

  it('injects a line range via file=', () => {
    const input = '```js file=./snippets/say-hi.js#L2-L4\n```';
    const output = processWithPath(input, mdPath);
    expect(output).toContain('function sayHi');
    expect(output).toContain('console.log');
    expect(output).not.toContain('// Say hi module');
    expect(output).not.toContain('module.exports');
  });

  it('injects a single line via file=', () => {
    const input = '```js file=./snippets/say-hi.js#L1\n```';
    const output = processWithPath(input, mdPath);
    expect(output).toContain('// Say hi module');
    expect(output).not.toContain('function sayHi');
  });

  it('injects from line to EOF via file=', () => {
    const input = '```js file=./snippets/say-hi.js#L5-\n```';
    const output = processWithPath(input, mdPath);
    expect(output).toContain('module.exports = sayHi;');
    expect(output).not.toContain('function sayHi');
  });

  it('strips assert lines by default', () => {
    const input = '```python file=./snippets/example.py#with_asserts\n```';
    const output = processWithPath(input, mdPath);
    expect(output).toContain('result = 2 + 2');
    expect(output).not.toContain('assert result == 4');
  });

  it('keeps asserts with ?noStrip', () => {
    const input =
      '```python file=./snippets/example.py#with_asserts?noStrip\n```';
    const output = processWithPath(input, mdPath);
    expect(output).toContain('assert result == 4');
  });

  it('strips file= attribute from meta by default', () => {
    const input =
      '```python title="example" file=./snippets/example.py#hello\n```';
    const output = processWithPath(input, mdPath);
    expect(output).not.toContain('file=');
    expect(output).toContain('title="example"');
  });

  it('preserves file= in meta when preserveFileMeta is true', () => {
    const input =
      '```python title="example" file=./snippets/example.py#hello\n```';
    const output = processWithPath(input, mdPath, { preserveFileMeta: true });
    expect(output).toContain('file=');
    expect(output).toContain('title="example"');
  });

  it('ignores code blocks without file= or reference=', () => {
    const input = '```python\nprint("hello")\n```';
    const output = processWithPath(input, mdPath);
    expect(output).toContain('print("hello")');
  });
});

describe('remarkCodeRegion — file= path resolution', () => {
  it('resolves relative to the markdown file directory', () => {
    // mdPath is inside fixturesDir; use ../fixtures/snippets to go up then back down
    const docsPath = path.join(fixturesDir, 'docs', 'page.md');
    const input = '```js file=../snippets/say-hi.js\n```';
    const output = processWithPath(input, docsPath);
    expect(output).toContain('function sayHi');
  });

  it('resolves <rootDir> prefix relative to rootDir', () => {
    const input = '```js file=<rootDir>/snippets/say-hi.js\n```';
    const output = processWithPath(input, mdPath);
    expect(output).toContain('function sayHi');
  });

  it('falls back to file.cwd when file.path not available', () => {
    // process() passes a plain string — no file.path, so file.dirname is undefined
    // file= will resolve relative to file.cwd (process.cwd())
    // Use <rootDir> to ensure it resolves correctly regardless of cwd
    const input = '```js file=<rootDir>/snippets/say-hi.js\n```';
    const output = process(input);
    expect(output).toContain('function sayHi');
  });
});

describe('remarkCodeRegion — file= security', () => {
  it('blocks path traversal outside rootDir', () => {
    const input = '```js file=../../../etc/passwd\n```';
    expect(() => processWithPath(input, mdPath)).toThrow(
      'resolves outside the root directory',
    );
  });

  it('allows outside references with allowOutsideRoot: true', () => {
    const input = '```markdown file=../../README.md\n```';
    const output = processWithPath(input, mdPath, { allowOutsideRoot: true });
    expect(output).toContain('remark-code-region');
  });

  it('blocks <rootDir>/../escape', () => {
    const input = '```js file=<rootDir>/../../../etc/passwd\n```';
    expect(() => processWithPath(input, mdPath)).toThrow(
      'resolves outside the root directory',
    );
  });
});

describe('remarkCodeRegion — file= errors', () => {
  it('throws on missing file', () => {
    const input = '```js file=./snippets/nonexistent.js\n```';
    expect(() => processWithPath(input, mdPath)).toThrow('cannot read file');
  });

  it('throws on missing region', () => {
    const input = '```python file=./snippets/example.py#nope\n```';
    expect(() => processWithPath(input, mdPath)).toThrow(
      "region 'nope' not found",
    );
  });

  it('throws on invalid line range (out of bounds)', () => {
    const input = '```js file=./snippets/say-hi.js#L99\n```';
    expect(() => processWithPath(input, mdPath)).toThrow(
      'line 99 is out of range',
    );
  });

  it('throws on unclosed region via file=', () => {
    const input = '```python file=./snippets/unclosed.py#oops\n```';
    expect(() => processWithPath(input, mdPath)).toThrow(
      'was opened but never closed',
    );
  });
});

describe('remarkCodeRegion — file= with strip option', () => {
  it('uses defaults when strip is undefined', () => {
    const input = '```python file=./snippets/example.py#with_asserts\n```';
    const output = processWithPath(input, mdPath);
    expect(output).toContain('result = 2 + 2');
    expect(output).not.toContain('assert result');
  });

  it('disables stripping when strip is false', () => {
    const input = '```python file=./snippets/example.py#with_asserts\n```';
    const output = processWithPath(input, mdPath, { strip: false });
    expect(output).toContain('assert result == 4');
  });

  it('uses custom patterns when strip is an array', () => {
    const input = '```python file=./snippets/example.py#with_asserts\n```';
    const output = processWithPath(input, mdPath, {
      strip: [/^\s*assert type/],
    });
    expect(output).toContain('assert result == 4');
    expect(output).not.toContain('assert type(result)');
  });
});

describe('remarkCodeRegion — file= auto-dedent', () => {
  it('removes common leading whitespace from indented regions', () => {
    const input = '```python file=./snippets/indented.py#create_user\n```';
    const output = processWithPath(input, mdPath);
    expect(output).toContain('from myapp import client');
    expect(output).toMatch(/^from myapp/m);
    expect(output).not.toMatch(/^ {8}from myapp/m);
  });

  it('dedents line ranges too', () => {
    // Lines 4-6 of indented.py are 8-space indented code inside the class method
    const input = '```python file=./snippets/indented.py#L4-L6\n```';
    const output = processWithPath(input, mdPath);
    // After dedent, should start at column 0
    expect(output).toMatch(/^from myapp/m);
    expect(output).not.toMatch(/^ {8}from myapp/m);
  });
});

describe('remarkCodeRegion — file= + reference= precedence', () => {
  it('reference= takes precedence when both present', () => {
    const input =
      '```python reference="snippets/example.py#hello" file=./snippets/example.py#with_asserts\n```';
    const output = processWithPath(input, mdPath);
    expect(output).toContain('name = "World"');
    expect(output).not.toContain('result = 2 + 2');
  });
});

describe('remarkCodeRegion — file= custom markers', () => {
  it('file= works with custom region markers (CSS)', () => {
    const opts = {
      regionMarkers: [...DEFAULT_REGION_MARKERS, PRESET_MARKERS.css],
    };
    const input = '```css file=./snippets/example.css#button_styles\n```';
    const output = processWithPath(input, mdPath, opts);
    expect(output).toContain('.btn {');
    expect(output).toContain('background: #3b82f6;');
  });
});

describe('remarkCodeRegion — clean option', () => {
  it('PRESET_CLEAN.compat skips dedent', () => {
    const input = '```python file=./snippets/indented.py#create_user\n```';
    const output = processWithPath(input, mdPath, {
      clean: [...PRESET_CLEAN.compat],
    });
    // Compat clean only trims — indentation preserved
    expect(output).toMatch(/^ {8}from myapp/m);
  });

  it('PRESET_CLEAN.compat skips blank-line collapse', () => {
    const input = '```python file=./snippets/example.py\n```';
    const normal = processWithPath(input, mdPath);
    const compat = processWithPath(input, mdPath, {
      clean: [...PRESET_CLEAN.compat],
    });
    // Compat output should be at least as long (no collapsing)
    expect(compat.length).toBeGreaterThanOrEqual(normal.length);
  });

  it('clean: false disables all cleaning', () => {
    const input = '```python file=./snippets/indented.py#create_user\n```';
    const output = processWithPath(input, mdPath, {
      clean: false,
      strip: false,
    });
    // No cleaning at all — raw extracted content including indentation
    expect(output).toMatch(/^ {8}from myapp/m);
  });

  it('custom clean steps work', () => {
    const input = '```python file=./snippets/indented.py#create_user\n```';
    // dedent + trimEnd but no collapse
    const output = processWithPath(input, mdPath, {
      clean: ['dedent', 'trimEnd'],
    });
    expect(output).toMatch(/^from myapp/m);
    expect(output).not.toMatch(/^ {8}from myapp/m);
  });

  it('clean applies equally to reference= and file=', () => {
    const refInput =
      '```python reference="snippets/indented.py#create_user"\n```';
    const fileInput = '```python file=./snippets/indented.py#create_user\n```';
    const opts = { clean: [...PRESET_CLEAN.compat] };
    const refOutput = process(refInput, opts);
    const fileOutput = processWithPath(fileInput, mdPath, opts);
    // Both paths use the same clean pipeline
    expect(refOutput).toMatch(/^ {8}from myapp/m);
    expect(fileOutput).toMatch(/^ {8}from myapp/m);
  });
});

describe('remarkCodeRegion — preserveFileMeta', () => {
  it('keeps file= in meta when preserveFileMeta is true', () => {
    const input = '```sql file=./snippets/compat-test.sql\n```';
    const output = processWithPath(input, mdPath, { preserveFileMeta: true });
    expect(output).toContain('file=./snippets/compat-test.sql');
  });

  it('strips file= from meta by default', () => {
    const input = '```sql title="test" file=./snippets/compat-test.sql\n```';
    const output = processWithPath(input, mdPath);
    expect(output).not.toContain('file=');
    expect(output).toContain('title="test"');
  });

  it('preserveFileMeta does not affect cleaning (clean option does)', () => {
    const input = '```python file=./snippets/indented.py#create_user\n```';
    // preserveFileMeta only controls meta, not content
    const output = processWithPath(input, mdPath, { preserveFileMeta: true });
    // Default clean still dedents
    expect(output).toMatch(/^from myapp/m);
  });
});
