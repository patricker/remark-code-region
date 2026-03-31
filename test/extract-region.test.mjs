import { describe, it, expect } from 'vitest';
import { extractRegion } from '../lib/extract-region.mjs';
import { REGION_START, REGION_END } from '../lib/patterns.mjs';

describe('extractRegion', () => {
  it('extracts a Python region', () => {
    const content = `# region: hello
print("hello")
# endregion: hello`;
    const result = extractRegion(content, 'hello', 'test.py', REGION_START, REGION_END);
    expect(result).toBe('print("hello")');
  });

  it('extracts a JS region', () => {
    const content = `// region: greet
console.log("hi");
// endregion: greet`;
    const result = extractRegion(content, 'greet', 'test.js', REGION_START, REGION_END);
    expect(result).toBe('console.log("hi");');
  });

  it('extracts the correct region when multiple exist', () => {
    const content = `# region: first
aaa
# endregion: first
# region: second
bbb
# endregion: second`;
    const result = extractRegion(content, 'second', 'test.py', REGION_START, REGION_END);
    expect(result).toBe('bbb');
  });

  it('preserves indentation', () => {
    const content = `// region: indented
    const x = 1;
    const y = 2;
// endregion: indented`;
    const result = extractRegion(content, 'indented', 'test.js', REGION_START, REGION_END);
    expect(result).toBe('    const x = 1;\n    const y = 2;');
  });

  it('handles empty region', () => {
    const content = `# region: empty
# endregion: empty`;
    const result = extractRegion(content, 'empty', 'test.py', REGION_START, REGION_END);
    expect(result).toBe('');
  });

  it('throws on missing region', () => {
    const content = `# region: exists
code
# endregion: exists`;
    expect(() => {
      extractRegion(content, 'nope', 'test.py', REGION_START, REGION_END);
    }).toThrow("region 'nope' not found in test.py");
  });

  it('preserves multi-line content with blank lines', () => {
    const content = `# region: multi
line1

line3
# endregion: multi`;
    const result = extractRegion(content, 'multi', 'test.py', REGION_START, REGION_END);
    expect(result).toBe('line1\n\nline3');
  });
});
