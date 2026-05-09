import { describe, expect, it } from 'vitest';
import remarkCodeRegionShiki from '../lib/shiki.mjs';

function makeCode(value, data = {}) {
  return { type: 'code', lang: 'python', value, data };
}

function makeTree(...children) {
  return { type: 'root', children };
}

function run(tree, options) {
  const transform = remarkCodeRegionShiki.call({}, options);
  transform(tree);
  return tree;
}

const SAMPLE = 'line1\nline2\nline3\nline4\nline5';

describe('remark-code-region/shiki', () => {
  describe('highlight', () => {
    it('annotates a single line', () => {
      const tree = makeTree(makeCode(SAMPLE, { highlight: '2' }));
      run(tree);
      const lines = tree.children[0].value.split('\n');
      expect(lines[0]).toBe('line1');
      expect(lines[1]).toBe('line2 # [!code highlight]');
      expect(lines[2]).toBe('line3');
    });

    it('annotates a range', () => {
      const tree = makeTree(makeCode(SAMPLE, { highlight: '2-4' }));
      run(tree);
      const lines = tree.children[0].value.split('\n');
      expect(lines[0]).toBe('line1');
      expect(lines[1]).toBe('line2 # [!code highlight]');
      expect(lines[2]).toBe('line3 # [!code highlight]');
      expect(lines[3]).toBe('line4 # [!code highlight]');
      expect(lines[4]).toBe('line5');
    });

    it('annotates mixed single and range', () => {
      const tree = makeTree(makeCode(SAMPLE, { highlight: '1,3-5' }));
      run(tree);
      const lines = tree.children[0].value.split('\n');
      expect(lines[0]).toBe('line1 # [!code highlight]');
      expect(lines[1]).toBe('line2');
      expect(lines[2]).toBe('line3 # [!code highlight]');
      expect(lines[3]).toBe('line4 # [!code highlight]');
      expect(lines[4]).toBe('line5 # [!code highlight]');
    });
  });

  describe('focus', () => {
    it('annotates a single line', () => {
      const tree = makeTree(makeCode(SAMPLE, { focus: '2' }));
      run(tree);
      const lines = tree.children[0].value.split('\n');
      expect(lines[1]).toBe('line2 # [!code focus]');
    });

    it('annotates a range', () => {
      const tree = makeTree(makeCode(SAMPLE, { focus: '1-3' }));
      run(tree);
      const lines = tree.children[0].value.split('\n');
      expect(lines[0]).toBe('line1 # [!code focus]');
      expect(lines[1]).toBe('line2 # [!code focus]');
      expect(lines[2]).toBe('line3 # [!code focus]');
      expect(lines[3]).toBe('line4');
    });
  });

  describe('combined', () => {
    it('applies both highlight and focus on different lines', () => {
      const tree = makeTree(makeCode(SAMPLE, { highlight: '1', focus: '3' }));
      run(tree);
      const lines = tree.children[0].value.split('\n');
      expect(lines[0]).toBe('line1 # [!code highlight]');
      expect(lines[1]).toBe('line2');
      expect(lines[2]).toBe('line3 # [!code focus]');
    });

    it('applies both highlight and focus on the same line', () => {
      const tree = makeTree(makeCode(SAMPLE, { highlight: '2', focus: '2' }));
      run(tree);
      const lines = tree.children[0].value.split('\n');
      expect(lines[1]).toBe('line2 # [!code highlight] # [!code focus]');
    });
  });

  describe('language-aware comments', () => {
    it('uses // for javascript', () => {
      const tree = makeTree({
        type: 'code',
        lang: 'javascript',
        value: SAMPLE,
        data: { highlight: '2' },
      });
      run(tree);
      expect(tree.children[0].value.split('\n')[1]).toBe(
        'line2 // [!code highlight]',
      );
    });

    it('uses /* */ for css', () => {
      const tree = makeTree({
        type: 'code',
        lang: 'css',
        value: SAMPLE,
        data: { highlight: '2' },
      });
      run(tree);
      expect(tree.children[0].value.split('\n')[1]).toBe(
        'line2 /* [!code highlight] */',
      );
    });

    it('uses <!-- --> for html', () => {
      const tree = makeTree({
        type: 'code',
        lang: 'html',
        value: SAMPLE,
        data: { highlight: '2' },
      });
      run(tree);
      expect(tree.children[0].value.split('\n')[1]).toBe(
        'line2 <!-- [!code highlight] -->',
      );
    });

    it('uses -- for sql', () => {
      const tree = makeTree({
        type: 'code',
        lang: 'sql',
        value: SAMPLE,
        data: { highlight: '2' },
      });
      run(tree);
      expect(tree.children[0].value.split('\n')[1]).toBe(
        'line2 -- [!code highlight]',
      );
    });

    it('falls back to // for unknown languages', () => {
      const tree = makeTree({
        type: 'code',
        lang: 'unknown',
        value: SAMPLE,
        data: { highlight: '2' },
      });
      run(tree);
      expect(tree.children[0].value.split('\n')[1]).toBe(
        'line2 // [!code highlight]',
      );
    });
  });

  describe('edge cases', () => {
    it('ignores out-of-range line numbers', () => {
      const tree = makeTree(makeCode(SAMPLE, { highlight: '100' }));
      run(tree);
      expect(tree.children[0].value).toBe(SAMPLE);
    });

    it('no-ops when no data present', () => {
      const tree = makeTree(makeCode(SAMPLE));
      run(tree);
      expect(tree.children[0].value).toBe(SAMPLE);
    });

    it('no-ops with empty spec', () => {
      const tree = makeTree(makeCode(SAMPLE, { highlight: '' }));
      run(tree);
      expect(tree.children[0].value).toBe(SAMPLE);
    });

    it('no-ops when no code nodes exist', () => {
      const tree = makeTree({
        type: 'paragraph',
        children: [{ type: 'text', value: 'hello' }],
      });
      const before = JSON.stringify(tree);
      run(tree);
      expect(JSON.stringify(tree)).toBe(before);
    });
  });

  describe('diffStepStyle: highlight', () => {
    it('converts // [!code ++] to # [!code highlight]', () => {
      const code = 'unchanged\nadded // [!code ++]\nalso unchanged';
      const tree = makeTree(makeCode(code));
      run(tree, { diffStepStyle: 'highlight' });
      const lines = tree.children[0].value.split('\n');
      expect(lines[0]).toBe('unchanged');
      expect(lines[1]).toBe('added # [!code highlight]');
      expect(lines[2]).toBe('also unchanged');
    });

    it('removes // [!code --] lines', () => {
      const code = 'keep\nremoved // [!code --]\nalso keep';
      const tree = makeTree(makeCode(code));
      run(tree, { diffStepStyle: 'highlight' });
      const lines = tree.children[0].value.split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('keep');
      expect(lines[1]).toBe('also keep');
    });

    it('preserves unmarked lines', () => {
      const code = 'plain line\nanother plain line';
      const tree = makeTree(makeCode(code));
      run(tree, { diffStepStyle: 'highlight' });
      expect(tree.children[0].value).toBe(code);
    });

    it('works with explicit highlight (line numbers refer to post-conversion)', () => {
      // After removing the -- line, "added" is line 2 and "after" is line 3
      const code = 'before\nremoved // [!code --]\nadded // [!code ++]\nafter';
      const tree = makeTree(makeCode(code, { highlight: '3' }));
      run(tree, { diffStepStyle: 'highlight' });
      const lines = tree.children[0].value.split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('before');
      expect(lines[1]).toBe('added # [!code highlight]');
      expect(lines[2]).toBe('after # [!code highlight]');
    });
  });
});
