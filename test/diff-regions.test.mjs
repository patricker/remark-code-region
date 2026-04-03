import { describe, expect, it } from 'vitest';
import {
  formatDiff,
  formatInlineAnnotations,
  formatUnified,
} from '../lib/diff-regions.mjs';

const before = 'def handler(request):\n    return Response(request.body)';
const after =
  'def handler(request):\n    validate(request)\n    return Response(request.body, status=200)';

describe('formatUnified', () => {
  it('produces +/- diff for changed lines', () => {
    const result = formatUnified(before, after);
    expect(result).toContain(' def handler(request):');
    expect(result).toContain('-    return Response(request.body)');
    expect(result).toContain('+    validate(request)');
    expect(result).toContain('+    return Response(request.body, status=200)');
  });

  it('handles identical inputs (no changes)', () => {
    const result = formatUnified('x = 1', 'x = 1');
    expect(result).toBe(' x = 1');
    expect(result).not.toContain('+');
    expect(result).not.toContain('-');
  });

  it('handles completely different inputs', () => {
    const result = formatUnified('a = 1', 'b = 2');
    expect(result).toContain('-a = 1');
    expect(result).toContain('+b = 2');
  });

  it('handles empty before (all additions)', () => {
    const result = formatUnified('', 'x = 1');
    expect(result).toContain('+x = 1');
  });

  it('handles empty after (all removals)', () => {
    const result = formatUnified('x = 1', '');
    expect(result).toContain('-x = 1');
  });
});

describe('formatInlineAnnotations', () => {
  it('adds [!code ++] to added lines and [!code --] to removed lines', () => {
    const result = formatInlineAnnotations(before, after);
    expect(result).toContain('    return Response(request.body) // [!code --]');
    expect(result).toContain('    validate(request) // [!code ++]');
    expect(result).toContain(
      '    return Response(request.body, status=200) // [!code ++]',
    );
  });

  it('unchanged lines have no annotation', () => {
    const result = formatInlineAnnotations(before, after);
    expect(result).toContain('def handler(request):');
    // The unchanged line should NOT have [!code]
    const unchangedLine = result
      .split('\n')
      .find((l) => l.includes('def handler'));
    expect(unchangedLine).not.toContain('[!code');
  });

  it('handles identical inputs', () => {
    const result = formatInlineAnnotations('x = 1', 'x = 1');
    expect(result).toBe('x = 1');
    expect(result).not.toContain('[!code');
  });
});

describe('formatDiff', () => {
  it('dispatches to unified by default', () => {
    const result = formatDiff(before, after, 'unified');
    expect(result.mode).toBe('unified');
    expect(result.value).toContain('-');
    expect(result.value).toContain('+');
  });

  it('dispatches to inline-annotations', () => {
    const result = formatDiff(before, after, 'inline-annotations');
    expect(result.mode).toBe('inline-annotations');
    expect(result.value).toContain('[!code ++]');
  });

  it('returns both codes for side-by-side', () => {
    const result = formatDiff(before, after, 'side-by-side');
    expect(result.mode).toBe('side-by-side');
    expect(result.before).toBe(before);
    expect(result.after).toBe(after);
    expect(result.value).toBeUndefined();
  });

  it('defaults to unified for unknown format', () => {
    const result = formatDiff(before, after, 'unknown');
    expect(result.mode).toBe('unified');
  });
});
