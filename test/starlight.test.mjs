import { describe, expect, it } from 'vitest';
import remarkCodeRegionStarlight from '../lib/starlight.mjs';

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
  const transform = remarkCodeRegionStarlight.call({}, options);
  transform(tree);
  return tree;
}

describe('remark-code-region/starlight', () => {
  it('transforms tabGroup into Tabs/TabItem JSX nodes', () => {
    const tree = makeTree(
      makeTabGroup([
        { lang: 'python', value: 'print("hi")' },
        { lang: 'javascript', value: 'console.log("hi")' },
      ]),
    );

    run(tree);

    // Import injected (named import)
    expect(tree.children[0].type).toBe('mdxjsEsm');
    expect(tree.children[0].value).toContain('{ Tabs, TabItem }');
    expect(tree.children[0].value).toContain('@astrojs/starlight/components');

    // Tabs node
    const tabs = tree.children[1];
    expect(tabs.type).toBe('mdxJsxFlowElement');
    expect(tabs.name).toBe('Tabs');

    // TabItems — label only, no value prop
    expect(tabs.children).toHaveLength(2);
    const [ti1, ti2] = tabs.children;
    expect(ti1.name).toBe('TabItem');
    expect(ti1.attributes).toContainEqual({
      type: 'mdxJsxAttribute',
      name: 'label',
      value: 'Python',
    });
    expect(ti1.attributes.find((a) => a.name === 'value')).toBeUndefined();
    expect(ti1.children[0].type).toBe('code');

    expect(ti2.attributes).toContainEqual({
      type: 'mdxJsxAttribute',
      name: 'label',
      value: 'Javascript',
    });
  });

  it('sets syncKey from sync key', () => {
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
      name: 'syncKey',
      value: 'lang',
    });
    // No groupId prop
    expect(tabs.attributes.find((a) => a.name === 'groupId')).toBeUndefined();
  });

  it('omits syncKey when no sync key present', () => {
    const tree = makeTree(makeTabGroup([{ lang: 'python' }, { lang: 'js' }]));

    run(tree);

    const tabs = tree.children[1];
    expect(tabs.attributes.find((a) => a.name === 'syncKey')).toBeUndefined();
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
        value: "import { Tabs, TabItem } from '@astrojs/starlight/components';",
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
    const tree = makeTree(
      makeTabGroup([{ lang: 'rust', value: 'fn main(){}' }]),
    );

    run(tree);

    const tabItem = tree.children[1].children[0];
    const code = tabItem.children[0];
    expect(code.type).toBe('code');
    expect(code.lang).toBe('rust');
    expect(code.value).toBe('fn main(){}');
  });

  it('supports custom import source', () => {
    const tree = makeTree(makeTabGroup([{ lang: 'python' }]));

    run(tree, { importSource: '@custom/components' });

    const imp = tree.children[0];
    expect(imp.value).toContain('@custom/components');
  });
});
