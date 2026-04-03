# remark-code-region

[![CI](https://github.com/patricker/remark-code-region/actions/workflows/ci.yml/badge.svg)](https://github.com/patricker/remark-code-region/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/remark-code-region)](https://www.npmjs.com/package/remark-code-region)
[![License: MIT](https://img.shields.io/npm/l/remark-code-region)](https://github.com/patricker/remark-code-region/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/remark-code-region)](https://nodejs.org/)

**Every code block in your docs is extracted from a passing test.**

Pull tested code straight from your test suite into your Docusaurus, Astro, or any remark-powered docs. Named regions, automatic test-line stripping, hard build failures on drift. Drop-in replacement for remark-code-import with full `file=` compatibility.

## The problem

Code examples in documentation go stale. You update an API, the tests pass, but the docs still show the old usage. Users copy broken code. Nobody notices until someone files an issue.

## The solution

Write your examples as real, executable tests. Mark regions with comments. Reference them from your docs. The plugin injects the tested code at build time.

```
              ┌──────────────────────────┐
              │   tests/test_sdk.py      │
              │                          │
              │   # region: create_user  │
              │   user = sdk.create(...) │  <- Runs in CI
              │   assert user.id         │
              │   # endregion            │
              └────────────┬─────────────┘
                           │
                      build time
                           │
              ┌────────────▼─────────────┐
              │   docs/quickstart.md     │
              │                          │
              │   ```python              │
              │   user = sdk.create(...) │  <- Injected (asserts stripped)
              │   ```                    │
              └──────────────────────────┘
```

If the test breaks, CI fails. If the region moves, the build fails. **Stale docs become impossible.**

## Quick start

Code fences without `reference` or `file=` are untouched -- migrate one block at a time.

Install:

```bash
npm install remark-code-region
```

Configure (Docusaurus):

```js
// docusaurus.config.js
const codeRegion = require('remark-code-region');

module.exports = {
  presets: [['classic', {
    docs: {
      remarkPlugins: [codeRegion],
    },
  }]],
};
```

Add region markers to your test file:

```python
# tests/test_users.py

def test_create_user():
    # region: create_user
    from myapp import client

    user = client.create_user(name="Alice", role="admin")
    print(user)
    # {"id": "usr_123", "name": "Alice", "role": "admin"}
    # endregion: create_user
    assert user["name"] == "Alice"
    assert user["role"] == "admin"
```

Reference it from your docs:

````markdown
```python reference="tests/test_users.py#create_user"
```
````

At build time, the code fence is replaced with:

```python
from myapp import client

user = client.create_user(name="Alice", role="admin")
print(user)
# {"id": "usr_123", "name": "Alice", "role": "admin"}
```

The `assert` lines are automatically stripped. The region markers are removed. Clean, tested code in your docs.

## Two syntaxes

remark-code-region supports two directive syntaxes. Both go through the same pipeline.

### `reference=` (recommended)

Paths resolve relative to `rootDir` (defaults to `process.cwd()`). The directive is stripped from meta after processing.

````markdown
```python reference="tests/test_users.py#create_user"
```
````

### `file=` (remark-code-import compatible)

Paths resolve relative to the markdown file. Drop-in replacement for remark-code-import -- all existing `file=` references work unchanged.

````markdown
```python file=./tests/test_users.py#create_user
```
````

Use `<rootDir>` to resolve relative to rootDir instead:

````markdown
```python file=<rootDir>/tests/test_users.py#create_user
```
````

Both syntaxes support named regions (`#region_name`), line ranges (`#L3-L6`), and query flags (`?noStrip`).

## Multi-region concatenation

Pull multiple regions from the same file into one code block:

````markdown
```python reference="tests/test_users.py#imports,create_user"
```
````

Regions are joined with a blank line separator (configurable via `regionSeparator`). Mix regions and line ranges:

````markdown
```python reference="tests/test_users.py#imports,L25-L30,create_user"
```
````

Whitespace around commas is trimmed. If any region is missing, the build fails.

## Region markers

Use comment-style markers that match your language:

```python
# region: name
code here
# endregion: name
```

```javascript
// region: name
code here
// endregion: name
```

**Supported out of the box** (no configuration needed):

| Comment style | Languages |
|---|---|
| `# region:` / `# endregion:` | Python, bash, Ruby, YAML, TOML |
| `// region:` / `// endregion:` | JavaScript, TypeScript, Rust, Go, Java, C, C++, Swift, Kotlin |

### Adding more languages

For languages that use different comment syntax, add marker presets via the `regionMarkers` option. Built-in presets are available for CSS, HTML, and SQL:

```js
const codeRegion = require('remark-code-region');
const { PRESET_MARKERS } = codeRegion;

remarkPlugins: [[codeRegion, {
  regionMarkers: [
    // Keep the defaults (# and // comments)
    ...codeRegion.DEFAULT_REGION_MARKERS,
    // Add CSS: /* region: name */ ... /* endregion: name */
    PRESET_MARKERS.css,
    // Add HTML: <!-- region: name --> ... <!-- endregion: name -->
    PRESET_MARKERS.html,
    // Add SQL/Lua: -- region: name ... -- endregion: name
    PRESET_MARKERS.sql,
  ],
}]],
```

### Custom markers

For any other comment style, define your own `{start, end}` regex pair. Group 1 must capture the region name:

```js
regionMarkers: [
  ...codeRegion.DEFAULT_REGION_MARKERS,
  {
    // Erlang/Elixir: %% region: name
    start: /^[ \t]*%%\s*region:\s*(\S+)\s*$/,
    end:   /^[ \t]*%%\s*endregion:\s*(\S+)\s*$/,
  },
],
```

## Automatic test-line stripping

These patterns are removed from injected code by default:

| Preset | Pattern | Language |
|---|---|---|
| `python` | `assert ...` | Python |
| `rust` | `assert_eq!()`, `assert_ne!()` | Rust |
| `java` | `assertEquals()`, `assertTrue()`, etc. | Java/JUnit |
| `js` | `expect()` | JS (Jest/Vitest) |
| `cpp` | `ASSERT_*`, `EXPECT_*` | C++ (gtest) |
| `go` | `if err != nil { t.Fatal` | Go |
| `markers` | Lines ending with `// test-only` or `# test-only` | Any |

To keep assertions visible in a specific block, append `?noStrip`:

````markdown
```python reference="tests/test_users.py#create_user?noStrip"
```
````

### Customizing strip patterns

Use `PRESET_STRIP` to compose exactly what you need:

```js
const codeRegion = require('remark-code-region');
const { PRESET_STRIP } = codeRegion;

remarkPlugins: [[codeRegion, {
  strip: [...PRESET_STRIP.python, ...PRESET_STRIP.js, ...PRESET_STRIP.markers],
}]],
```

Available presets: `python`, `rust`, `java`, `js`, `cpp`, `go`, `markers`.

Or disable stripping entirely:

```js
remarkPlugins: [[codeRegion, { strip: false }]],
```

## Assertion transmutation

Instead of stripping assertions, **transform** them into readable output comments that show expected values:

```python
# Test file:
user = client.create_user(name="Alice", role="admin")
assert user["name"] == "Alice"
assert user["role"] == "admin"
assert user["id"]

# In your docs (with transmutation):
user = client.create_user(name="Alice", role="admin")
# user["name"] => "Alice"
# user["role"] => "admin"
# user["id"] => (truthy)
```

Enable transmutation with composable per-language presets:

```js
const codeRegion = require('remark-code-region');
const { PRESET_TRANSMUTE } = codeRegion;

remarkPlugins: [[codeRegion, {
  transmute: [...PRESET_TRANSMUTE.python, ...PRESET_TRANSMUTE.js],
}]],
```

Available presets: `python`, `js`, `rust`, `java`, `go`, `cpp`.

Each language transforms assertions into `subject => value` comments using the correct comment prefix (`#` for Python, `//` for JS, etc.):

| Language | Before | After |
|---|---|---|
| Python | `assert user["name"] == "Alice"` | `# user["name"] => "Alice"` |
| JS | `expect(sum(2, 3)).toBe(5);` | `// sum(2, 3) => 5` |
| Rust | `assert_eq!(rows.len(), 1);` | `// rows.len() => 1` |
| Java | `assertEquals("Alice", name);` | `// name => "Alice"` |
| Go | `assert.Equal(t, 3, len(rows))` | `// len(rows) => 3` |
| C++ | `ASSERT_EQ(x, 1);` | `// x => 1` |

Inequality and negation are kept natural: `assert x != 0` becomes `# x != 0`.

Transmutation is opt-in and runs before strip. Transmuted lines become comments and skip stripping. Unmatched lines fall through to strip as usual. Use `?noTransmute` to disable per block.

## Diff between two regions

Show a highlighted diff between two tested code states -- for migration guides, changelogs, and "what changed in v2" docs.

````markdown
```python diff reference="tests/test_api.py#v1_handler" diff-reference="#v2_handler"
```
````

The primary `reference=` is the "before", `diff-reference=` is the "after". Same-file shorthand (`#v2_handler`) inherits the file from the primary. Cross-file diffs work too.

Three output modes (set globally via `diffFormat` option or per-block with `?format=`):

**`unified` (default)** -- standard diff format, `lang` set to `"diff"`:

```diff
 def handler(request):
-    return Response(request.body)
+    validate(request)
+    return Response(request.body, status=200)
```

**`inline-annotations`** -- Shiki `[!code ++]` / `[!code --]` markers, original language preserved:

```python
    return Response(request.body) // [!code --]
    validate(request) // [!code ++]
    return Response(request.body, status=200) // [!code ++]
```

**`side-by-side`** -- emits two sibling code nodes with `data-diff-role="before"` / `"after"` for custom component rendering.

Both sides go through the full cleaning pipeline (strip, transmute, dedent) independently before diffing.

```js
remarkPlugins: [[codeRegion, { diffFormat: 'inline-annotations' }]],
```

Per-block override:

````markdown
```python reference="file.py#v1?format=inline-annotations" diff-reference="#v2"
```
````

The `diff-file=` syntax works alongside `file=` for remark-code-import compatible paths.

## Step-by-step tutorial diffs

For tutorials where each step builds on the previous, use `diff-step` to show the current step's complete code with highlights on what changed:

````markdown
First, create the basic app:

```python reference="tests/tutorial.py#step1"
```

Now add configuration:

```python reference="tests/tutorial.py#step2" diff-step="step1"
```

Finally, add authentication:

```python reference="tests/tutorial.py#step3" diff-step="step2"
```
````

**Step 1** renders as plain code. **Step 2** renders with `// [!code ++]` on lines added since step 1. **Step 3** shows what changed since step 2. Each block is a standalone code fence with its own prose context.

The reader sees complete, copyable code at every step -- with green/red highlights showing exactly what's new. Every step is a passing test.

`diff-step` defaults to `inline-annotations` (Shiki highlighting). Override with `?format=unified` for +/- diff output.

| | `diff-reference` | `diff-step` |
|---|---|---|
| Use case | Migration guide (before/after) | Tutorial (step-by-step) |
| Output | Diff only | Full current code with change annotations |
| Default format | `unified` (+/- prefixes) | `inline-annotations` (Shiki highlights) |

## Tab groups

Group consecutive code fences into tabs using the `tab` attribute. Each fence is processed independently (reference extraction, strip, transmute, diff — everything works), then consecutive `tab` fences are wrapped in a `tabGroup` AST node.

**Multi-language tabs:**

````md
```python tab="Python" reference="tests/test_sdk.py#create_user"
```

```javascript tab="Node.js" reference="tests/test_sdk.js#create_user"
```
````

**Same-language version comparison:**

````md
```python tab="SDK v1" reference="tests/v1.py#create_user"
```

```python tab="SDK v2" reference="tests/v2.py#create_user"
```
````

**Inline code tabs (no reference needed):**

````md
```bash tab="npm"
npm install myapp
```

```bash tab="yarn"
yarn add myapp
```
````

Bare `tab` (no value) derives the label from the language tag: `` ```python tab `` → label "Python".

### Sync key

Use `tab-group="id"` to synchronize tab selection across multiple tab groups on a page (like Docusaurus `groupId` or Starlight `syncKey`). Clicking "Python" in one group switches all groups with the same sync key.

```md
```python tab="Python" tab-group="lang" reference="tests/install.py#pip"
```

To split adjacent tab groups without visible content between them, use an HTML comment (`<!-- -->`), which creates an invisible node that breaks the consecutive grouping.

### AST output

The plugin emits `tabGroup` wrapper nodes with `data.hName = 'div'` and `data.hProperties.class = 'code-tabs'` (customizable via `tabGroupClass` option). Each child code node gets `data.tabLabel` and `data.hProperties['data-tab']`.

Without a companion plugin, this renders as a `<div class="code-tabs">` wrapping stacked `<pre><code>` blocks. Framework-specific companion plugins (coming soon) will transform these into native Docusaurus `<Tabs>`, Starlight tabs, etc.

## Auto-dedent

Extracted regions are automatically dedented. Common leading whitespace is removed so that code nested inside test functions or classes renders flush-left in your docs.

```python
def test_create_user():
    # region: create_user
    from myapp import client
    user = client.create_user(name="Alice")
    # endregion: create_user
```

...renders as:

```python
from myapp import client
user = client.create_user(name="Alice")
```

Dedent is part of the configurable `clean` pipeline. To disable it, use `clean: ['collapse', 'trim']` (omitting `'dedent'`).

## Clean pipeline

The `clean` option controls the whitespace processing pipeline. Same API shape as `strip`: `undefined` uses defaults, `false` disables all, `string[]` for a custom list.

Available steps (run in array order):

| Step | What it does |
|---|---|
| `'dedent'` | Remove common leading whitespace |
| `'collapse'` | Collapse 3+ consecutive blank lines to 2 |
| `'trim'` | Trim leading and trailing whitespace |
| `'trimEnd'` | Trim trailing whitespace only |

```js
const codeRegion = require('remark-code-region');
const { PRESET_CLEAN } = codeRegion;

// Default: ['dedent', 'collapse', 'trim']
remarkPlugins: [[codeRegion, { clean: [...PRESET_CLEAN.default] }]],

// remark-code-import compat: only strip trailing whitespace
remarkPlugins: [[codeRegion, { clean: [...PRESET_CLEAN.compat] }]],

// Custom: dedent and trim, but keep blank line runs intact
remarkPlugins: [[codeRegion, { clean: ['dedent', 'trim'] }]],

// Disable all cleaning
remarkPlugins: [[codeRegion, { clean: false }]],
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `rootDir` | `string` | `process.cwd()` | Base directory for resolving `reference=` paths. |
| `allowOutsideRoot` | `boolean` | `false` | Allow references to files outside `rootDir`. Disabled by default as a security boundary. |
| `regionMarkers` | `{start, end}[]` | `DEFAULT_REGION_MARKERS` | Region marker pairs. Each `start`/`end` is a RegExp where group 1 captures the region name. |
| `strip` | `RegExp[]` \| `false` | `undefined` (defaults) | Patterns to strip from injected code. `undefined` uses built-in defaults. `false` disables. `RegExp[]` replaces defaults. |
| `transmute` | `TransmuteRule[]` \| `false` | `undefined` (disabled) | Transform assertions into output comments. `undefined`/`false` disables. `TransmuteRule[]` enables with those rules. |
| `clean` | `string[]` \| `false` | `['dedent', 'collapse', 'trim']` | Whitespace cleaning steps. `false` disables. `string[]` for custom list. |
| `regionSeparator` | `string` | `'\n\n'` | String inserted between regions in multi-region concatenation. |
| `preserveFileMeta` | `boolean` | `false` | Keep `file=` in meta after processing (matches remark-code-import behavior). |
| `diffFormat` | `string` | `'unified'` | Output format for diff blocks: `'unified'`, `'inline-annotations'`, or `'side-by-side'`. |
| `tabGroupClass` | `string` | `'code-tabs'` | CSS class for tab group wrapper `<div>`. |

**Exports** (for composing custom configurations):

| Export | What it is |
|---|---|
| `DEFAULT_REGION_MARKERS` | Default region marker pairs (`#` and `//` comments) |
| `PRESET_MARKERS` | Additional markers: `.css`, `.html`, `.sql` |
| `PRESET_STRIP` | Strip patterns by language: `.python`, `.rust`, `.java`, `.js`, `.cpp`, `.go`, `.markers` |
| `DEFAULT_STRIP_PATTERNS` | All built-in strip patterns (union of all `PRESET_STRIP` groups) |
| `PRESET_TRANSMUTE` | Transmute rules by language: `.python`, `.js`, `.rust`, `.java`, `.go`, `.cpp` |
| `DEFAULT_TRANSMUTE_RULES` | All transmute rules combined |
| `PRESET_CLEAN` | Clean step presets: `.default`, `.compat` |
| `DEFAULT_CLEAN` | Default clean steps (`['dedent', 'collapse', 'trim']`) |
| `COMMENT_PREFIX` | Language tag to comment prefix map (70+ languages) |

```js
const codeRegion = require('remark-code-region');

remarkPlugins: [[codeRegion, {
  rootDir: __dirname,
  regionMarkers: [
    ...codeRegion.DEFAULT_REGION_MARKERS,
    codeRegion.PRESET_MARKERS.css,
  ],
  strip: [...codeRegion.PRESET_STRIP.python, ...codeRegion.PRESET_STRIP.js],
  transmute: [...codeRegion.PRESET_TRANSMUTE.python],
  clean: ['dedent', 'trim'],
}]],
```

## Hard failure on drift

If a referenced file is missing or a region doesn't exist, **the build fails**:

```
Error: remark-code-region: region 'create_user' not found in tests/test_users.py
```

If a region is opened but never closed, **the build fails**:

```
Error: remark-code-region: region 'create_user' in tests/test_users.py was opened but never closed
```

This is intentional. Silent stale docs are worse than a build error.

## MDX compatibility

Works inside MDX components (`<Tabs>`, admonitions) -- the plugin runs at the remark AST level, before MDX processing. Any code fence with a `reference` or `file=` attribute is resolved, regardless of where it sits in the markdown tree.

## Framework support

### Docusaurus

```js
const codeRegion = require('remark-code-region');

module.exports = {
  presets: [['classic', {
    docs: { remarkPlugins: [codeRegion] },
  }]],
};
```

### Astro

```js
import codeRegion from 'remark-code-region';

export default defineConfig({
  markdown: { remarkPlugins: [codeRegion] },
});
```

### Next.js (MDX)

```js
import codeRegion from 'remark-code-region';

const withMDX = createMDX({
  options: { remarkPlugins: [codeRegion] },
});
```

### Raw remark/unified

```js
import { remark } from 'remark';
import codeRegion from 'remark-code-region';

const result = await remark()
  .use(codeRegion, { rootDir: '/path/to/repo' })
  .process(markdown);
```

> **Note:** VitePress uses markdown-it (not remark) and is not compatible.

## Migrating from remark-code-import

remark-code-region is a drop-in replacement. All `file=` syntax works unchanged:

```diff
- const remarkCodeImport = require('remark-code-import');
+ const remarkCodeImport = require('remark-code-region');
```

remark-code-import dropped `require()` support in v1.0.0. If your Docusaurus config uses `require()`, you're stuck on an old version. remark-code-region supports both `require()` and `import`.

| Feature | remark-code-import | remark-code-region |
|---|---|---|
| Include from file | `file=./path.js#L3-L6` | `reference="path.py#region_name"` or `file=` |
| **Named regions** | No | Yes -- stable across edits |
| **Line ranges** | Yes | Yes (via `file=` syntax) |
| **Multi-region** | No | Yes (`#imports,create_user`) |
| **Strip test lines** | No | Auto-strips asserts, expects, test-only markers |
| **Transmute assertions** | No | Transforms assertions into `=> value` comments |
| **Diff two regions** | No | `diff-reference=` with unified, inline-annotation, or side-by-side output |
| **Tutorial step diffs** | No | `diff-step=` shows current code with change highlights from previous step |
| **Auto-dedent** | Opt-in | On by default (configurable) |
| **Composable clean pipeline** | No | `PRESET_CLEAN.default` / `.compat` / custom |
| **Security boundary** | `allowImportingFromOutside` | `allowOutsideRoot` (default: false) |
| **CJS `require()` support** | Dropped in v1.0 | Yes |
| Fail on missing file | Yes | Yes |

For exact byte-identical output during migration:

```js
const codeRegion = require('remark-code-region');
const { PRESET_CLEAN } = codeRegion;

remarkPlugins: [[codeRegion, {
  clean: [...PRESET_CLEAN.compat],
  preserveFileMeta: true,
  strip: false,
}]],
```

## License

MIT
