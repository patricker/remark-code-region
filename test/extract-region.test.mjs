import { describe, it, expect } from 'vitest';
import { extractRegion } from '../lib/extract-region.mjs';
import { DEFAULT_REGION_MARKERS, PRESET_MARKERS } from '../lib/patterns.mjs';

describe('extractRegion', () => {
  it('extracts a Python region', () => {
    const content = `# region: hello\nprint("hello")\n# endregion: hello`;
    const result = extractRegion(content, 'hello', 'test.py', DEFAULT_REGION_MARKERS);
    expect(result).toBe('print("hello")');
  });

  it('extracts a JS region', () => {
    const content = `// region: greet\nconsole.log("hi");\n// endregion: greet`;
    const result = extractRegion(content, 'greet', 'test.js', DEFAULT_REGION_MARKERS);
    expect(result).toBe('console.log("hi");');
  });

  it('extracts the correct region when multiple exist', () => {
    const content = `# region: first\naaa\n# endregion: first\n# region: second\nbbb\n# endregion: second`;
    const result = extractRegion(content, 'second', 'test.py', DEFAULT_REGION_MARKERS);
    expect(result).toBe('bbb');
  });

  it('preserves indentation', () => {
    const content = `// region: indented\n    const x = 1;\n    const y = 2;\n// endregion: indented`;
    const result = extractRegion(content, 'indented', 'test.js', DEFAULT_REGION_MARKERS);
    expect(result).toBe('    const x = 1;\n    const y = 2;');
  });

  it('handles empty region', () => {
    const content = `# region: empty\n# endregion: empty`;
    const result = extractRegion(content, 'empty', 'test.py', DEFAULT_REGION_MARKERS);
    expect(result).toBe('');
  });

  it('throws on missing region', () => {
    const content = `# region: exists\ncode\n# endregion: exists`;
    expect(() => {
      extractRegion(content, 'nope', 'test.py', DEFAULT_REGION_MARKERS);
    }).toThrow("region 'nope' not found in test.py");
  });

  it('preserves multi-line content with blank lines', () => {
    const content = `# region: multi\nline1\n\nline3\n# endregion: multi`;
    const result = extractRegion(content, 'multi', 'test.py', DEFAULT_REGION_MARKERS);
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

  it('extracts multi-line CSS', () => {
    const content = `/* region: card */\n.card {\n  padding: 1rem;\n  border: 1px solid #ccc;\n}\n/* endregion: card */`;
    const result = extractRegion(content, 'card', 'styles.css', markers);
    expect(result).toBe('.card {\n  padding: 1rem;\n  border: 1px solid #ccc;\n}');
  });
});

describe('extractRegion with SQL markers', () => {
  const markers = [...DEFAULT_REGION_MARKERS, PRESET_MARKERS.sql];

  it('extracts a SQL region', () => {
    const content = `-- region: create\nCREATE TABLE t (id INT);\n-- endregion: create`;
    const result = extractRegion(content, 'create', 'schema.sql', markers);
    expect(result).toBe('CREATE TABLE t (id INT);');
  });

  it('extracts multi-line SQL', () => {
    const content = `-- region: insert\nINSERT INTO t VALUES (1);\nINSERT INTO t VALUES (2);\n-- endregion: insert`;
    const result = extractRegion(content, 'insert', 'data.sql', markers);
    expect(result).toBe('INSERT INTO t VALUES (1);\nINSERT INTO t VALUES (2);');
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
    // Hypothetical file with embedded SQL and JS
    const content = [
      '// region: js_part',
      'const x = 1;',
      '// endregion: js_part',
      '-- region: sql_part',
      'SELECT * FROM t;',
      '-- endregion: sql_part',
    ].join('\n');

    expect(extractRegion(content, 'js_part', 'mixed.txt', allMarkers)).toBe('const x = 1;');
    expect(extractRegion(content, 'sql_part', 'mixed.txt', allMarkers)).toBe('SELECT * FROM t;');
  });
});
