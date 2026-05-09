import { describe, expect, it } from 'vitest';
import remarkCodeRegionDocusaurus from '../lib/docusaurus.mjs';

function makeTabGroup(tabs, syncKey) {
  return {
    type: 'tabGroup',
    data: {
      hName: 'div',
      hProperties: {
        class: 'code-tabs',
        ...(syncKey && { 'data-tab-group': syncKey }),
      },
    },
    children: tabs.map(({ lang, value, label, groupId }) => ({
      type: 'code',
      lang,
      value: value || '',
      data: {
        tabLabel: label || lang.charAt(0).toUpperCase() + lang.slice(1),
        ...(groupId && { tabGroupId: groupId }),
        hProperties: {
          'data-tab': label || lang.charAt(0).toUpperCase() + lang.slice(1),
        },
      },
    })),
  };
}

function makeTree(...children) {
  return { type: 'root', children };
}

function run(tree, options) {
  const transform = remarkCodeRegionDocusaurus.call({}, options);
  transform(tree);
  return tree;
}

describe('remark-code-region/docusaurus', () => {
  it('transforms tabGroup into Tabs/TabItem JSX nodes', () => {
    const tree = makeTree(
      makeTabGroup([
        { lang: 'python', value: 'print("hi")' },
        { lang: 'javascript', value: 'console.log("hi")' },
      ]),
    );

    run(tree);

    // Import injected
    expect(tree.children[0].type).toBe('mdxjsEsm');
    expect(tree.children[0].value).toContain('@theme/Tabs');
    expect(tree.children[0].value).toContain('@theme/TabItem');

    // Tabs node
    const tabs = tree.children[1];
    expect(tabs.type).toBe('mdxJsxFlowElement');
    expect(tabs.name).toBe('Tabs');

    // TabItems
    expect(tabs.children).toHaveLength(2);
    const [ti1, ti2] = tabs.children;
    expect(ti1.name).toBe('TabItem');
    expect(ti1.attributes).toContainEqual({
      type: 'mdxJsxAttribute',
      name: 'value',
      value: 'python',
    });
    expect(ti1.attributes).toContainEqual({
      type: 'mdxJsxAttribute',
      name: 'label',
      value: 'Python',
    });
    expect(ti1.children[0].type).toBe('code');
    expect(ti1.children[0].value).toBe('print("hi")');

    expect(ti2.attributes).toContainEqual({
      type: 'mdxJsxAttribute',
      name: 'value',
      value: 'javascript',
    });
    expect(ti2.attributes).toContainEqual({
      type: 'mdxJsxAttribute',
      name: 'label',
      value: 'Javascript',
    });
  });

  it('sets groupId from sync key', () => {
    const tree = makeTree(
      makeTabGroup(
        [
          { lang: 'python', groupId: 'lang' },
          { lang: 'js', groupId: 'lang' },
        ],
        'lang',
      ),
    );

    run(tree);

    const tabs = tree.children[1];
    expect(tabs.attributes).toContainEqual({
      type: 'mdxJsxAttribute',
      name: 'groupId',
      value: 'lang',
    });
  });

  it('sets defaultValue to first tab value', () => {
    const tree = makeTree(
      makeTabGroup([
        { lang: 'rust', value: 'fn main(){}' },
        { lang: 'go', value: 'func main(){}' },
      ]),
    );

    run(tree);

    const tabs = tree.children[1];
    expect(tabs.attributes).toContainEqual({
      type: 'mdxJsxAttribute',
      name: 'defaultValue',
      value: 'rust',
    });
  });

  it('injects import only once with multiple tab groups', () => {
    const tree = makeTree(
      makeTabGroup([{ lang: 'python' }]),
      makeTabGroup([{ lang: 'js' }]),
    );

    run(tree);

    const imports = tree.children.filter((n) => n.type === 'mdxjsEsm');
    expect(imports).toHaveLength(1);
  });

  it('skips import injection when already present', () => {
    const tree = makeTree(
      {
        type: 'mdxjsEsm',
        value:
          "import Tabs from '@theme/Tabs';\nimport TabItem from '@theme/TabItem';",
        data: { estree: null },
      },
      makeTabGroup([{ lang: 'python' }]),
    );

    run(tree);

    const imports = tree.children.filter((n) => n.type === 'mdxjsEsm');
    expect(imports).toHaveLength(1);
  });

  it('no-ops when no tabGroup nodes exist', () => {
    const tree = makeTree({
      type: 'paragraph',
      children: [{ type: 'text', value: 'hello' }],
    });
    const before = JSON.stringify(tree);

    run(tree);

    expect(JSON.stringify(tree)).toBe(before);
  });

  it('preserves code nodes inside TabItem', () => {
    const tree = makeTree(makeTabGroup([{ lang: 'python', value: 'x = 1' }]));

    run(tree);

    const tabItem = tree.children[1].children[0];
    const code = tabItem.children[0];
    expect(code.type).toBe('code');
    expect(code.lang).toBe('python');
    expect(code.value).toBe('x = 1');
  });

  it('slugifies labels for value prop', () => {
    const tree = makeTree(
      makeTabGroup([
        { lang: 'cpp', label: 'C++' },
        { lang: 'python', label: 'My Custom Label' },
      ]),
    );

    run(tree);

    const tabs = tree.children[1];
    expect(tabs.children[0].attributes).toContainEqual({
      type: 'mdxJsxAttribute',
      name: 'value',
      value: 'cpp',
    });
    expect(tabs.children[1].attributes).toContainEqual({
      type: 'mdxJsxAttribute',
      name: 'value',
      value: 'my-custom-label',
    });
  });

  it('supports custom import paths', () => {
    const tree = makeTree(makeTabGroup([{ lang: 'python' }]));

    run(tree, { tabsImport: '@custom/Tabs', tabItemImport: '@custom/TabItem' });

    const imp = tree.children[0];
    expect(imp.value).toContain('@custom/Tabs');
    expect(imp.value).toContain('@custom/TabItem');
  });
});
