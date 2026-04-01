import { describe, it, expect } from 'vitest';
import { remark } from 'remark';
import remarkCodeRegion, { PRESET_STRIP } from '../index.mjs';
import { PRESET_MARKERS } from '../lib/patterns.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    const input = '```python reference="snippets/example.py#with_asserts?noStrip"\n```';
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
    const input = '```python title="example" reference="snippets/example.py#hello"\n```';
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
    const input = '```python reference="snippets/example.py#with_asserts?noStrip"\n```';
    const output = process(input);
    expect(output).toContain('assert result == 4');
  });

  it('handles multiple flags', () => {
    const input = '```python reference="snippets/example.py#with_asserts?noStrip&future"\n```';
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
      { start: /^[ \t]*#\s*region:\s*(\S+)\s*$/, end: /^[ \t]*#\s*endregion:\s*(\S+)\s*$/ },
      { start: /^[ \t]*\/\/\s*region:\s*(\S+)\s*$/, end: /^[ \t]*\/\/\s*endregion:\s*(\S+)\s*$/ },
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
      { start: /^[ \t]*#\s*region:\s*(\S+)\s*$/, end: /^[ \t]*#\s*endregion:\s*(\S+)\s*$/ },
      { start: /^[ \t]*\/\/\s*region:\s*(\S+)\s*$/, end: /^[ \t]*\/\/\s*endregion:\s*(\S+)\s*$/ },
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
