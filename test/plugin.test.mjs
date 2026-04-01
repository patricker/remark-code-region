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

describe('remarkCodeRegion plugin', () => {
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

  it('keeps asserts with ?keepAsserts', () => {
    const input = '```python reference="snippets/example.py#with_asserts?keepAsserts"\n```';
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

  it('throws on missing file', () => {
    const input = '```python reference="snippets/nonexistent.py#hello"\n```';
    expect(() => process(input)).toThrow('cannot read file');
  });

  it('throws on missing region', () => {
    const input = '```python reference="snippets/example.py#nope"\n```';
    expect(() => process(input)).toThrow("region 'nope' not found");
  });

  it('ignores code blocks without reference attribute', () => {
    const input = '```python\nprint("hello")\n```';
    const output = process(input);
    expect(output).toContain('print("hello")');
  });

  it('supports custom attribute name', () => {
    const input = '```python src="snippets/example.py#hello"\n```';
    const output = process(input, { attribute: 'src' });
    expect(output).toContain('name = "World"');
  });

  it('supports custom strip patterns', () => {
    const input = '```python reference="snippets/example.py#multiline"\n```';
    const output = process(input, {
      stripPatterns: [/^\s*message\s*=/],
    });
    expect(output).toContain('def greet');
    expect(output).not.toContain('message =');
  });

  it('supports global keepAsserts option', () => {
    const input = '```python reference="snippets/example.py#with_asserts"\n```';
    const output = process(input, { keepAsserts: true });
    expect(output).toContain('assert result == 4');
  });

  it('replaces default strip patterns when replaceDefaultStrip is true', () => {
    const input = '```python reference="snippets/example.py#with_asserts"\n```';
    // Replace defaults with an empty list — nothing gets stripped
    const output = process(input, { stripPatterns: [], replaceDefaultStrip: true });
    expect(output).toContain('assert result == 4');
    expect(output).toContain('assert type(result)');
  });

  it('replaceDefaultStrip with custom patterns strips only those', () => {
    const input = '```python reference="snippets/example.py#with_asserts"\n```';
    // Only strip "assert type" lines, keep "assert result"
    const output = process(input, {
      stripPatterns: [/^\s*assert type/],
      replaceDefaultStrip: true,
    });
    expect(output).toContain('assert result == 4');
    expect(output).not.toContain('assert type(result)');
  });

  it('PRESET_STRIP groups can be composed', () => {
    const input = '```python reference="snippets/example.py#with_asserts"\n```';
    // Use only Python preset — should still strip assert lines
    const output = process(input, {
      stripPatterns: [...PRESET_STRIP.python, ...PRESET_STRIP.markers],
      replaceDefaultStrip: true,
    });
    expect(output).not.toContain('assert result');
    expect(output).not.toContain('assert type');
    expect(output).toContain('result = 2 + 2');
  });

  it('PRESET_STRIP.js strips expect() when used alone', () => {
    const input = '```js reference="snippets/example.js#with_expects"\n```';
    const output = process(input, {
      stripPatterns: [...PRESET_STRIP.js],
      replaceDefaultStrip: true,
    });
    expect(output).not.toContain('expect(');
    expect(output).toContain('console.log');
  });
});

describe('remarkCodeRegion with CSS regions', () => {
  const opts = {
    regionMarkers: [
      // Include defaults + CSS preset
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

describe('remarkCodeRegion with SQL regions', () => {
  const opts = {
    regionMarkers: [
      { start: /^[ \t]*#\s*region:\s*(\S+)\s*$/, end: /^[ \t]*#\s*endregion:\s*(\S+)\s*$/ },
      { start: /^[ \t]*\/\/\s*region:\s*(\S+)\s*$/, end: /^[ \t]*\/\/\s*endregion:\s*(\S+)\s*$/ },
      PRESET_MARKERS.sql,
    ],
  };

  it('injects a SQL region', () => {
    const input = '```sql reference="snippets/example.sql#create_table"\n```';
    const output = process(input, opts);
    expect(output).toContain('CREATE TABLE users');
    expect(output).toContain('SERIAL PRIMARY KEY');
  });

  it('extracts only the requested SQL region', () => {
    const input = '```sql reference="snippets/example.sql#insert_data"\n```';
    const output = process(input, opts);
    expect(output).toContain("INSERT INTO users");
    expect(output).not.toContain('CREATE TABLE');
  });
});

describe('remarkCodeRegion with HTML regions', () => {
  const opts = {
    regionMarkers: [
      { start: /^[ \t]*#\s*region:\s*(\S+)\s*$/, end: /^[ \t]*#\s*endregion:\s*(\S+)\s*$/ },
      { start: /^[ \t]*\/\/\s*region:\s*(\S+)\s*$/, end: /^[ \t]*\/\/\s*endregion:\s*(\S+)\s*$/ },
      PRESET_MARKERS.html,
    ],
  };

  it('injects an HTML region', () => {
    const input = '```html reference="snippets/example.html#nav_bar"\n```';
    const output = process(input, opts);
    expect(output).toContain('<nav class="navbar">');
    expect(output).toContain('</nav>');
  });
});
