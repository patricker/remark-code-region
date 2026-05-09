/**
 * Companion plugin for Shiki.
 *
 * Injects Shiki inline annotations (// [!code highlight], // [!code focus])
 * into code blocks based on data stored by remark-code-region.
 *
 * Pipeline order:
 *   1. remark-code-region       → parses ?highlight=/?focus=, stores on node.data
 *   2. remark-code-region/shiki → reads node.data, injects annotations into node.value
 *   3. remark-rehype + @shikijs/rehype → Shiki processes the annotations
 *
 * Requires @shikijs/transformers (transformerNotationHighlight,
 * transformerNotationFocus) configured in your Shiki setup.
 *
 * Usage:
 *   import codeRegion from 'remark-code-region';
 *   import codeRegionShiki from 'remark-code-region/shiki';
 *   remarkPlugins: [codeRegion, codeRegionShiki],
 */

import { visit } from 'unist-util-visit';

/**
 * Map language to comment syntax for Shiki annotations.
 * Shiki's transformers only recognise annotations inside language-valid comments,
 * so we must wrap `[!code ...]` in the correct comment style.
 *
 * Returns `{ prefix, suffix }` — the suffix is empty for line-comment languages.
 */
const COMMENT_STYLES = {
  '#': { prefix: '# ', suffix: '' },
  '//': { prefix: '// ', suffix: '' },
  '--': { prefix: '-- ', suffix: '' },
  'block-css': { prefix: '/* ', suffix: ' */' },
  'block-html': { prefix: '<!-- ', suffix: ' -->' },
};

const LANG_COMMENT = {
  // Hash-style
  python: '#',
  py: '#',
  ruby: '#',
  rb: '#',
  bash: '#',
  sh: '#',
  zsh: '#',
  perl: '#',
  pl: '#',
  r: '#',
  toml: '#',
  yaml: '#',
  yml: '#',
  powershell: '#',
  ps1: '#',
  elixir: '#',
  ex: '#',
  // Slash-style
  javascript: '//',
  js: '//',
  typescript: '//',
  ts: '//',
  jsx: '//',
  tsx: '//',
  rust: '//',
  rs: '//',
  go: '//',
  java: '//',
  c: '//',
  cpp: '//',
  'c++': '//',
  csharp: '//',
  'c#': '//',
  swift: '//',
  kotlin: '//',
  kt: '//',
  scala: '//',
  dart: '//',
  php: '//',
  groovy: '//',
  zig: '//',
  // Dash-style
  sql: '--',
  lua: '--',
  haskell: '--',
  hs: '--',
  // Block-style
  css: 'block-css',
  scss: 'block-css',
  less: 'block-css',
  html: 'block-html',
  xml: 'block-html',
  svg: 'block-html',
  vue: 'block-html',
  svelte: 'block-html',
  mdx: 'block-html',
};

function commentFor(lang) {
  const key = lang ? LANG_COMMENT[lang.toLowerCase()] : undefined;
  return COMMENT_STYLES[key] ?? COMMENT_STYLES['//'];
}

/**
 * Parse a line spec like '1,3-5,8' into a Set of 1-based line numbers.
 * @param {string} spec
 * @returns {Set<number>}
 */
function parseLineSpec(spec) {
  const lines = new Set();
  if (!spec) return lines;
  for (const part of spec.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const range = trimmed.match(/^(\d+)-(\d+)$/);
    if (range) {
      const start = Number.parseInt(range[1], 10);
      const end = Number.parseInt(range[2], 10);
      for (let i = start; i <= end; i++) lines.add(i);
    } else {
      const n = Number.parseInt(trimmed, 10);
      if (!Number.isNaN(n)) lines.add(n);
    }
  }
  return lines;
}

/**
 * Inject Shiki annotations on specified lines of a code node.
 * Uses language-appropriate comment syntax so Shiki's transformers recognise them.
 * @param {object} node - mdast code node
 * @param {string} spec - line spec like '1,3-5'
 * @param {string} annotation - 'highlight' or 'focus'
 */
function injectAnnotations(node, spec, annotation) {
  if (!node.value) return;
  const lineSet = parseLineSpec(spec);
  if (lineSet.size === 0) return;
  const { prefix, suffix } = commentFor(node.lang);
  const lines = node.value.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lineSet.has(i + 1)) {
      lines[i] = `${lines[i]} ${prefix}[!code ${annotation}]${suffix}`;
    }
  }
  node.value = lines.join('\n');
}

/**
 * Convert diff-step ++/-- annotations to highlight style.
 * Lines with // [!code --] are removed. Lines with // [!code ++] become highlight annotations.
 * The output uses language-appropriate comment syntax.
 * @param {object} node - mdast code node
 */
function convertDiffToHighlight(node) {
  if (!node.value) return;
  const { prefix, suffix } = commentFor(node.lang);
  const lines = node.value.split('\n');
  const result = [];
  for (const line of lines) {
    if (line.endsWith(' // [!code --]')) {
      continue;
    }
    if (line.endsWith(' // [!code ++]')) {
      result.push(
        `${line.slice(0, -' // [!code ++]'.length)} ${prefix}[!code highlight]${suffix}`,
      );
    } else {
      result.push(line);
    }
  }
  node.value = result.join('\n');
}

export default function remarkCodeRegionShiki(options = {}) {
  const { diffStepStyle } = options;

  return (tree) => {
    visit(tree, 'code', (node) => {
      if (diffStepStyle === 'highlight') {
        convertDiffToHighlight(node);
      }
      if (node.data?.highlight) {
        injectAnnotations(node, node.data.highlight, 'highlight');
      }
      if (node.data?.focus) {
        injectAnnotations(node, node.data.focus, 'focus');
      }
    });
  };
}
