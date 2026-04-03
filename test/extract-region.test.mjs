import { describe, expect, it } from 'vitest';
import { extractRegion } from '../lib/extract-region.mjs';
import { DEFAULT_REGION_MARKERS, PRESET_MARKERS } from '../lib/patterns.mjs';

describe('extractRegion', () => {
  it('extracts a Python region', () => {
    const content = `# region: hello\nprint("hello")\n# endregion: hello`;
    const result = extractRegion(
      content,
      'hello',
      'test.py',
      DEFAULT_REGION_MARKERS,
    );
    expect(result).toBe('print("hello")');
  });

  it('extracts a JS region', () => {
    const content = `// region: greet\nconsole.log("hi");\n// endregion: greet`;
    const result = extractRegion(
      content,
      'greet',
      'test.js',
      DEFAULT_REGION_MARKERS,
    );
    expect(result).toBe('console.log("hi");');
  });

  it('extracts the correct region when multiple exist', () => {
    const content = `# region: first\naaa\n# endregion: first\n# region: second\nbbb\n# endregion: second`;
    const result = extractRegion(
      content,
      'second',
      'test.py',
      DEFAULT_REGION_MARKERS,
    );
    expect(result).toBe('bbb');
  });

  it('preserves indentation', () => {
    const content = `// region: indented\n    const x = 1;\n    const y = 2;\n// endregion: indented`;
    const result = extractRegion(
      content,
      'indented',
      'test.js',
      DEFAULT_REGION_MARKERS,
    );
    expect(result).toBe('    const x = 1;\n    const y = 2;');
  });

  it('handles empty region', () => {
    const content = `# region: empty\n# endregion: empty`;
    const result = extractRegion(
      content,
      'empty',
      'test.py',
      DEFAULT_REGION_MARKERS,
    );
    expect(result).toBe('');
  });

  it('throws on missing region', () => {
    const content = `# region: exists\ncode\n# endregion: exists`;
    expect(() => {
      extractRegion(content, 'nope', 'test.py', DEFAULT_REGION_MARKERS);
    }).toThrow("region 'nope' not found in test.py");
  });

  it('throws on unclosed region', () => {
    const content = `# region: hello\nsome code\nmore code`;
    expect(() => {
      extractRegion(content, 'hello', 'test.py', DEFAULT_REGION_MARKERS);
    }).toThrow("region 'hello' in test.py was opened but never closed");
  });

  it('throws on unclosed region with typo in endregion', () => {
    const content = `# region: hello\ncode\n# endregion: helo`;
    expect(() => {
      extractRegion(content, 'hello', 'test.py', DEFAULT_REGION_MARKERS);
    }).toThrow('was opened but never closed');
  });

  it('preserves multi-line content with blank lines', () => {
    const content = `# region: multi\nline1\n\nline3\n# endregion: multi`;
    const result = extractRegion(
      content,
      'multi',
      'test.py',
      DEFAULT_REGION_MARKERS,
    );
    expect(result).toBe('line1\n\nline3');
  });
});

describe('extractRegion with CSS markers', () => {
  const markers = [...DEFAULT_REGION_MARKERS, PRESET_MARKERS.css];

  it('extracts a CSS region', () => {
    const content = `/* region: button */\n.btn { color: red; }\n/* endregion: button */`;
    const result = extractRegion(content, 'button', 'styles.css', markers);
    expect(result).toBe('.btn { color: red; }');
  });
});

describe('extractRegion with SQL markers', () => {
  const markers = [...DEFAULT_REGION_MARKERS, PRESET_MARKERS.sql];

  it('extracts a SQL region', () => {
    const content = `-- region: create\nCREATE TABLE t (id INT);\n-- endregion: create`;
    const result = extractRegion(content, 'create', 'schema.sql', markers);
    expect(result).toBe('CREATE TABLE t (id INT);');
  });
});

describe('extractRegion with HTML markers', () => {
  const markers = [...DEFAULT_REGION_MARKERS, PRESET_MARKERS.html];

  it('extracts an HTML region', () => {
    const content = `<!-- region: nav -->\n<nav>Home</nav>\n<!-- endregion: nav -->`;
    const result = extractRegion(content, 'nav', 'page.html', markers);
    expect(result).toBe('<nav>Home</nav>');
  });
});

describe('extractRegion with mixed markers', () => {
  const allMarkers = [
    ...DEFAULT_REGION_MARKERS,
    PRESET_MARKERS.css,
    PRESET_MARKERS.sql,
    PRESET_MARKERS.html,
  ];

  it('handles a file with different comment styles', () => {
    const content = [
      '// region: js_part',
      'const x = 1;',
      '// endregion: js_part',
      '-- region: sql_part',
      'SELECT * FROM t;',
      '-- endregion: sql_part',
    ].join('\n');

    expect(extractRegion(content, 'js_part', 'mixed.txt', allMarkers)).toBe(
      'const x = 1;',
    );
    expect(extractRegion(content, 'sql_part', 'mixed.txt', allMarkers)).toBe(
      'SELECT * FROM t;',
    );
  });

  it('duplicate region names: captures from both occurrences', () => {
    const content = [
      '# region: dupe',
      'first',
      '# endregion: dupe',
      '# region: dupe',
      'second',
      '# endregion: dupe',
    ].join('\n');
    const result = extractRegion(
      content,
      'dupe',
      'test.py',
      DEFAULT_REGION_MARKERS,
    );
    // Both regions' content is captured (re-enters capturing on second start)
    expect(result).toContain('first');
    expect(result).toContain('second');
  });
});
