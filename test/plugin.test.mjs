import { describe, it, expect } from 'vitest';
import { remark } from 'remark';
import remarkCodeRegion from '../index.mjs';
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
    // Should contain code from multiple regions (whole file)
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
    // Add a pattern that strips "message = " lines
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
});
