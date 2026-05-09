/**
 * Companion plugin for Astro Starlight.
 *
 * Transforms `tabGroup` AST nodes into Starlight `<Tabs>` / `<TabItem>`
 * MDX JSX elements with `syncKey` for synchronized tab switching.
 *
 * Usage:
 *   import codeRegion from 'remark-code-region';
 *   import codeRegionTabs from 'remark-code-region/starlight';
 *   remarkPlugins: [codeRegion, codeRegionTabs],
 */

import { visit } from 'unist-util-visit';

function attr(name, value) {
  return { type: 'mdxJsxAttribute', name, value };
}

export default function remarkCodeRegionStarlight(options = {}) {
  const { importSource = '@astrojs/starlight/components' } = options;

  return (tree) => {
    let hasTabGroups = false;

    visit(tree, 'tabGroup', (node, index, parent) => {
      hasTabGroups = true;

      const syncKey = node.data?.hProperties?.['data-tab-group'] || null;
      const children = node.children || [];

      const tabItems = children.map((child) => {
        const label = child.data?.tabLabel || 'Code';

        return {
          type: 'mdxJsxFlowElement',
          name: 'TabItem',
          attributes: [attr('label', label)],
          children: [child],
        };
      });

      const tabsAttrs = [];
      if (syncKey) {
        tabsAttrs.push(attr('syncKey', syncKey));
      }

      const tabsNode = {
        type: 'mdxJsxFlowElement',
        name: 'Tabs',
        attributes: tabsAttrs,
        children: tabItems,
      };

      parent.children[index] = tabsNode;
    });

    if (hasTabGroups) {
      injectImport(tree, importSource);
    }
  };
}

function injectImport(tree, importSource) {
  const alreadyImported = tree.children.some(
    (node) =>
      node.type === 'mdxjsEsm' &&
      node.value &&
      (node.value.includes(`'${importSource}'`) ||
        node.value.includes(`"${importSource}"`)),
  );
  if (alreadyImported) return;

  tree.children.unshift({
    type: 'mdxjsEsm',
    value: `import { Tabs, TabItem } from '${importSource}';`,
    data: { estree: null },
  });
}
