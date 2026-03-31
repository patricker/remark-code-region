# remark-code-region

**Every code block in your docs is extracted from a passing test.**

Pull tested code straight from your test suite into your Docusaurus, Astro, or any remark-powered docs. Named regions, automatic test-line stripping, hard build failures on drift.

## The problem

Code examples in documentation go stale. You update an API, the tests pass, but the docs still show the old usage. Users copy broken code. Nobody notices until someone files an issue.

## The solution

Write your examples as real, executable tests. Mark regions with comments. Reference them from your docs. The plugin injects the tested code at build time.

```
              ┌─────────────────────┐
              │   test_api.py       │
              │                     │
              │   # region: basic   │
              │   rows = loads(...) │  ← Runs in CI
              │   assert len(rows)  │
              │   # endregion       │
              └──────────┬──────────┘
                         │
                    build time
                         │
              ┌──────────▼──────────┐
              │   docs/api.md       │
              │                     │
              │   ```python         │
              │   rows = loads(...) │  ← Injected (asserts stripped)
              │   ```               │
              └─────────────────────┘
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
# test_api.py

def test_parse_basic():
    # region: parse_basic
    import mhn

    rows = mhn.loads("Name|Age\nAlice|30")
    print(rows)
    # [{"Name": "Alice", "Age": "30"}]
    # endregion: parse_basic
    assert rows[0]["Name"] == "Alice"
```

Reference it from your docs:

````markdown
```python reference="tests/test_api.py#parse_basic"
```
````

At build time, the code fence is replaced with:

```python
import mhn

rows = mhn.loads("Name|Age\nAlice|30")
print(rows)
# [{"Name": "Alice", "Age": "30"}]
```

The `assert` line is automatically stripped. The region markers are removed. Clean, tested code in your docs.

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
```python reference="tests/test_api.py#parse_basic?keepAsserts"
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
Error: remark-code-region: region 'parse_basic' not found in tests/test_api.py
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
| **Fail on missing** | Silent | **Hard build failure** |
| Line ranges | Yes | No (regions are better) |

Line ranges break every time you edit the source file. Regions are stable — add code above or below, the region still works. And auto-stripping is what makes "code lives in test files" practical.

## License

MIT
