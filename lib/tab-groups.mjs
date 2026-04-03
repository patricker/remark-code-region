/**
 * Tab group support for remark-code-region.
 *
 * Groups consecutive code fences with `tab="Label"` into `tabGroup` wrapper
 * nodes. Pass 2 of the plugin pipeline — runs after reference extraction.
 */

/** Matches `tab="Label"` or bare `tab` keyword. Group 1 = label (or undefined). */
export const TAB_REGEX = /(?:^|\s)tab(?:="([^"]*)")?(?=\s|$)/;

/** Matches `tab-group="id"`. Group 1 = sync key. Anchored to avoid matching inside `data-tab-group=`. */
export const TAB_GROUP_REGEX = /(?:^|\s)tab-group="([^"]+)"/;

/**
 * Derive a tab label from a code fence language tag.
 * @param {string|null} lang
 * @returns {string}
 */
export function deriveTabLabel(lang) {
  if (!lang) return 'Code';
  return lang.charAt(0).toUpperCase() + lang.slice(1);
}

/**
 * Strip tab= (quoted or bare) and tab-group= from a meta string.
 * @param {string|null} meta
 * @returns {string|null}
 */
export function cleanTabMeta(meta) {
  if (!meta) return null;
  let m = meta;
  // Strip tab-group= first (before tab=, to avoid partial match).
  // Anchored to avoid matching inside data-tab-group= or similar.
  m = m.replace(/(?:^|\s)tab-group="[^"]*"/, '');
  // Strip tab="..." (quoted). Anchored to avoid matching inside data-tab=.
  m = m.replace(/(?:^|\s)tab="[^"]*"/, '');
  // Strip bare tab keyword
  m = m.replace(/(?:^|\s)tab(?=\s|$)/, '');
  return m.trim() || null;
}

/**
 * Walk a parent node's children array and group consecutive `tab=` code
 * fences into `tabGroup` wrapper nodes. Recurses into container nodes.
 *
 * @param {object} parent - An mdast node with a children array.
 * @param {string} tabGroupClass - CSS class for the wrapper div.
 */
export function groupTabsInParent(parent, tabGroupClass = 'code-tabs') {
  if (!parent.children) return;

  // Recurse into container nodes first (blockquote, listItem, etc.)
  for (const child of parent.children) {
    if (child.children) {
      groupTabsInParent(child, tabGroupClass);
    }
  }

  // Now group consecutive tab code fences in this parent
  const newChildren = [];
  let i = 0;

  while (i < parent.children.length) {
    const child = parent.children[i];

    // Check if this is a tab code fence
    if (child.type === 'code' && child.meta && TAB_REGEX.test(child.meta)) {
      // Accumulate consecutive tab code fences
      const run = [];
      while (i < parent.children.length) {
        const node = parent.children[i];
        if (node.type !== 'code' || !node.meta || !TAB_REGEX.test(node.meta)) {
          break;
        }
        run.push(node);
        i++;
      }

      // Process each node in the run: parse label, set data, clean meta
      let syncKey = null;
      for (const node of run) {
        const tabMatch = node.meta.match(TAB_REGEX);
        const label =
          tabMatch[1] !== undefined && tabMatch[1] !== ''
            ? tabMatch[1]
            : deriveTabLabel(node.lang);

        const groupMatch = node.meta.match(TAB_GROUP_REGEX);
        const nodeGroupId = groupMatch ? groupMatch[1] : null;
        if (nodeGroupId && !syncKey) {
          syncKey = nodeGroupId;
        }

        // Set data properties for companion plugins and rehype
        node.data = node.data || {};
        node.data.tabLabel = label;
        if (nodeGroupId) {
          node.data.tabGroupId = nodeGroupId;
        }
        node.data.hProperties = node.data.hProperties || {};
        node.data.hProperties['data-tab'] = label;

        // Clean tab attrs from meta
        node.meta = cleanTabMeta(node.meta);
      }

      // Create the wrapper node
      const hProperties = { class: tabGroupClass };
      if (syncKey) {
        hProperties['data-tab-group'] = syncKey;
      }

      const tabGroupNode = {
        type: 'tabGroup',
        data: {
          hName: 'div',
          hProperties,
        },
        children: run,
        position: {
          start: run[0].position?.start,
          end: run[run.length - 1].position?.end,
        },
      };

      newChildren.push(tabGroupNode);
    } else {
      newChildren.push(child);
      i++;
    }
  }

  parent.children = newChildren;
}
