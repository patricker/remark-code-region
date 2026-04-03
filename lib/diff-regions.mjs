/**
 * Diff formatting for comparing two code regions.
 *
 * Three output modes:
 *   'unified'            — standard +/- diff format
 *   'inline-annotations' — Shiki [!code ++]/[!code --] annotations
 *   'side-by-side'       — returns both codes for two-node rendering
 */

import { diffLines } from 'diff';

/**
 * Compute line-level changes between two code strings.
 *
 * @param {string} before - The "before" code.
 * @param {string} after - The "after" code.
 * @returns {Array<{value: string, added?: boolean, removed?: boolean}>}
 */
function computeDiff(before, after) {
  // Ensure both end with newline for consistent diffing
  const a = before.endsWith('\n') ? before : `${before}\n`;
  const b = after.endsWith('\n') ? after : `${after}\n`;
  return diffLines(a, b, { oneChangePerToken: true });
}

/**
 * Format a diff in unified format with +/- prefixes.
 *
 * @param {string} before - Cleaned "before" code.
 * @param {string} after - Cleaned "after" code.
 * @returns {string} Unified diff string.
 */
export function formatUnified(before, after) {
  const changes = computeDiff(before, after);
  const lines = [];
  for (const change of changes) {
    const text = change.value.replace(/\r?\n$/, '');
    const prefix = change.added ? '+' : change.removed ? '-' : ' ';
    lines.push(prefix + text);
  }
  return lines.join('\n');
}

/**
 * Format a diff with Shiki inline annotations.
 * Preserves the original language; appends // [!code ++] or // [!code --].
 *
 * @param {string} before - Cleaned "before" code.
 * @param {string} after - Cleaned "after" code.
 * @returns {string} Annotated code string.
 */
export function formatInlineAnnotations(before, after) {
  const changes = computeDiff(before, after);
  const lines = [];
  for (const change of changes) {
    const text = change.value.replace(/\r?\n$/, '');
    if (change.removed) {
      lines.push(`${text} // [!code --]`);
    } else if (change.added) {
      lines.push(`${text} // [!code ++]`);
    } else {
      lines.push(text);
    }
  }
  return lines.join('\n');
}

/**
 * Dispatch to the correct diff formatter.
 *
 * @param {string} before - Cleaned "before" code.
 * @param {string} after - Cleaned "after" code.
 * @param {'unified' | 'inline-annotations' | 'side-by-side'} format - Output format.
 * @returns {{ mode: string, value?: string, before?: string, after?: string }}
 */
export function formatDiff(before, after, format) {
  switch (format) {
    case 'inline-annotations':
      return {
        mode: 'inline-annotations',
        value: formatInlineAnnotations(before, after),
      };
    case 'side-by-side':
      return { mode: 'side-by-side', before, after };
    default:
      return { mode: 'unified', value: formatUnified(before, after) };
  }
}
