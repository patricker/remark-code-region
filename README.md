# remark-code-region

**Every code block in your docs is extracted from a passing test.**

Pull tested code straight from your test suite into your Docusaurus, Astro, or any remark-powered docs. Named regions, automatic test-line stripping, hard build failures on drift.

## The problem

Code examples in documentation go stale. You update an API, the tests pass, but the docs still show the old usage. Users copy broken code. Nobody notices until someone files an issue.

## The solution

Write your examples as real, executable tests. Mark regions with comments. Reference them from your docs. The plugin injects the tested code at build time.

```
              ┌──────────────────────────┐
              │   tests/test_sdk.py      │
              │                          │
              │   # region: create_user  │
              │   user = sdk.create(...) │  ← Runs in CI
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
              │   user = sdk.create(...) │  ← Injected (asserts stripped)
              │   ```                    │
              └──────────────────────────┘
```

If the test breaks, CI fails. If the region moves, the build fails. **Stale docs become impossible.**

## Quick start

Code fences without `reference` are untouched -- migrate one block at a time.

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

Then use the corresponding comment syntax in your source files:

```css
/* region: button_styles */
.btn {
  padding: 0.5rem 1rem;
  background: #3b82f6;
}
/* endregion: button_styles */
```

```sql
-- region: create_table
CREATE TABLE users (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);
-- endregion: create_table
```

```html
<!-- region: nav_bar -->
<nav class="navbar">
  <a href="/">Home</a>
  <a href="/docs">Docs</a>
</nav>
<!-- endregion: nav_bar -->
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

The `assert` and `expect()` patterns match lines starting with these keywords. If your library uses these as API calls (not test assertions), pass a custom `strip` list using `PRESET_STRIP` to include only the languages you need.

To keep assertions visible in a specific block, append `?noStrip`:

````markdown
```python reference="tests/test_users.py#create_user?noStrip"
```
````

### Customizing strip patterns

The default strips assertions for every supported language. If you only use Python and JS, or need to add your own patterns, use `PRESET_STRIP` to compose exactly what you want:

```js
const codeRegion = require('remark-code-region');
const { PRESET_STRIP } = codeRegion;

remarkPlugins: [[codeRegion, {
  // Only strip Python asserts, JS expects, and test-only markers
  strip: [...PRESET_STRIP.python, ...PRESET_STRIP.js, ...PRESET_STRIP.markers],
}]],
```

Available presets: `python`, `rust`, `java`, `js`, `cpp`, `go`, `markers`.

You can also add custom patterns alongside the defaults:

```js
const codeRegion = require('remark-code-region');
const { PRESET_STRIP } = codeRegion;

remarkPlugins: [[codeRegion, {
  // Custom list — defaults plus your own test helpers
  strip: [
    ...PRESET_STRIP.python,
    ...PRESET_STRIP.js,
    ...PRESET_STRIP.markers,
    /^\s*check\(/,
    /^\s*verify\(/,
  ],
}]],
```

Or disable stripping entirely:

```js
remarkPlugins: [[codeRegion, { strip: false }]],
```

## Auto-dedent

Extracted regions are automatically dedented. Common leading whitespace is removed so that code nested inside test functions or classes renders flush-left in your docs. No option needed -- this is always on.

For example, code indented inside a test function:

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

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `rootDir` | `string` | `process.cwd()` | Base directory for resolving reference paths. |
| `allowOutsideRoot` | `boolean` | `false` | Allow references to files outside `rootDir`. Disabled by default as a security boundary. |
| `regionMarkers` | `{start, end}[]` | `DEFAULT_REGION_MARKERS` | Region marker pairs. Each `start`/`end` is a RegExp where group 1 captures the region name. |
| `strip` | `RegExp[]` \| `false` | `undefined` (defaults) | Patterns to strip from injected code. `undefined` uses the built-in defaults. `false` disables stripping. `RegExp[]` replaces the defaults with your custom list. |

**Exports** (for composing custom configurations):

| Export | What it is |
|---|---|
| `DEFAULT_REGION_MARKERS` | Default region marker pairs (`#` and `//` comments) |
| `PRESET_MARKERS` | Additional markers: `.css`, `.html`, `.sql` |
| `PRESET_STRIP` | Strip patterns by language: `.python`, `.rust`, `.java`, `.js`, `.cpp`, `.go`, `.markers` |

```js
remarkPlugins: [[codeRegion, {
  rootDir: __dirname,
  regionMarkers: [
    ...codeRegion.DEFAULT_REGION_MARKERS,
    codeRegion.PRESET_MARKERS.css,
    codeRegion.PRESET_MARKERS.sql,
  ],
  strip: [...codeRegion.PRESET_STRIP.python, ...codeRegion.PRESET_STRIP.js],
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

Works inside MDX components (`<Tabs>`, admonitions) -- the plugin runs at the remark AST level, before MDX processing. Any code fence with a `reference` attribute will be resolved, regardless of where it sits in the markdown tree.

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

VitePress uses markdown-it (not remark) and is not compatible.

## Why not remark-code-import?

[remark-code-import](https://github.com/kevin940726/remark-code-import) includes code from files using line ranges (`#L3-L6`). It's good for static inclusion, but:

| Feature | remark-code-import | remark-code-region |
|---|---|---|
| Include from file | `file=./path.js#L3-L6` | `reference="path.py#region_name"` |
| **Named regions** | No | Yes -- stable across edits |
| **Strip test lines** | No | Auto-strips asserts, expects, test-only markers |
| **Auto-dedent** | Yes | Yes |
| **Security boundary** | Yes | Yes (`allowOutsideRoot` defaults to false) |
| Fail on missing file | Yes | Yes |
| Line ranges | Yes | No (regions don't shift when code is edited) |

Both plugins fail on missing files. The key difference is **how you target code**. Line ranges (`#L3-L6`) shift every time you add or remove a line above them. Named regions are anchored by markers in the source -- edit freely above or below, the region stays correct. And auto-stripping test assertions is what makes "code lives in test files" practical -- without it, you'd need separate display-only copies.

## License

MIT
