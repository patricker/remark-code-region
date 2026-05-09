/**
 * Companion plugin for Docusaurus.
 *
 * Transforms `tabGroup` AST nodes into Docusaurus `<Tabs>` / `<TabItem>`
 * MDX JSX elements with `groupId` for synchronized tab switching.
 *
 * Usage:
 *   import codeRegion from 'remark-code-region';
 *   import codeRegionTabs from 'remark-code-region/docusaurus';
 *   remarkPlugins: [codeRegion, codeRegionTabs],
 */

import { visit } from 'unist-util-visit';

function slugify(label) {
  const slug = label
    .toLowerCase()
    .replace(/\+/g, 'p')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `tab-${label.length}`;
}

function attr(name, value) {
  return { type: 'mdxJsxAttribute', name, value };
}

export default function remarkCodeRegionDocusaurus(options = {}) {
  const { tabsImport = '@theme/Tabs', tabItemImport = '@theme/TabItem' } =
    options;

  return (tree) => {
    let hasTabGroups = false;

    visit(tree, 'tabGroup', (node, index, parent) => {
      hasTabGroups = true;

      const syncKey = node.data?.hProperties?.['data-tab-group'] || null;
      const children = node.children || [];

      const tabItems = children.map((child) => {
        const label = child.data?.tabLabel || 'Code';
        const value = slugify(label);

        const attributes = [attr('value', value), attr('label', label)];

        return {
          type: 'mdxJsxFlowElement',
          name: 'TabItem',
          attributes,
          children: [child],
        };
      });

      const tabsAttrs = [];
      if (syncKey) {
        tabsAttrs.push(attr('groupId', syncKey));
      }
      if (tabItems.length > 0) {
        const firstValue = tabItems[0].attributes.find(
          (a) => a.name === 'value',
        )?.value;
        if (firstValue) {
          tabsAttrs.push(attr('defaultValue', firstValue));
        }
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
      injectImport(tree, tabsImport, tabItemImport);
    }
  };
}

function injectImport(tree, tabsImport, tabItemImport) {
  const alreadyImported = tree.children.some(
    (node) =>
      node.type === 'mdxjsEsm' &&
      node.value &&
      (node.value.includes(`'${tabsImport}'`) ||
        node.value.includes(`"${tabsImport}"`)),
  );
  if (alreadyImported) return;

  tree.children.unshift({
    type: 'mdxjsEsm',
    value: `import Tabs from '${tabsImport}';\nimport TabItem from '${tabItemImport}';`,
    data: { estree: null },
  });
}
