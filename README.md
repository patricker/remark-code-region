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

Works with Python, JavaScript, TypeScript, Rust, Go, Java, C, C++, bash, and any language using `#` or `//` comments.

## Automatic test-line stripping

These patterns are removed from injected code by default:

| Pattern | Language |
|---|---|
| `assert ...` | Python |
| `assert_eq!()`, `assert_ne!()` | Rust |
| `assertEquals()`, `assertTrue()`, etc. | Java/JUnit |
| `expect()` | JS (Jest/Vitest) |
| `ASSERT_*`, `EXPECT_*` | C++ (gtest) |
| `if err != nil { t.Fatal` | Go |
| Lines ending with `// test-only` | Any |
| Lines ending with `# test-only` | Python/bash |

To keep assertions visible, append `?keepAsserts`:

````markdown
```python reference="tests/test_users.py#create_user?keepAsserts"
```
````

## Options

```js
remarkPlugins: [[codeRegion, {
  // Base directory for resolving paths (default: process.cwd())
  rootDir: __dirname,

  // Additional patterns to strip (merged with defaults)
  stripPatterns: [/^\s*check\(/],

  // Disable stripping globally
  keepAsserts: false,

  // Custom attribute name (default: "reference")
  attribute: 'reference',
}]],
```

## Hard failure on drift

If a referenced file is missing or a region doesn't exist, **the build fails**:

```
Error: remark-code-region: region 'create_user' not found in tests/test_users.py
```

This is intentional. Silent stale docs are worse than a build error.

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

## Why not remark-code-import?

[remark-code-import](https://github.com/kevin940726/remark-code-import) includes code from files using line ranges (`#L3-L6`). It's good for static inclusion, but:

| Feature | remark-code-import | remark-code-region |
|---|---|---|
| Include from file | `file=./path.js#L3-L6` | `reference="path.py#region_name"` |
| **Named regions** | No | Yes — stable across edits |
| **Strip test lines** | No | Auto-strips asserts, expects, test-only markers |
| Fail on missing file | Yes | Yes |
| Line ranges | Yes | No (regions don't shift when code is edited) |

Both plugins fail on missing files. The key difference is **how you target code**. Line ranges (`#L3-L6`) shift every time you add or remove a line above them. Named regions are anchored by markers in the source — edit freely above or below, the region stays correct. And auto-stripping test assertions is what makes "code lives in test files" practical — without it, you'd need separate display-only copies.

## License

MIT
