/**
 * remark-code-region — CJS entry point.
 *
 * Re-exports the esbuild-bundled ESM code so that:
 *   const codeRegion = require('remark-code-region')
 * returns the plugin function directly (not a namespace object).
 *
 * Named exports are attached as properties on the function:
 *   const { PRESET_STRIP, PRESET_MARKERS } = require('remark-code-region')
 */

const _bundle = require('./index.build.cjs');
const remarkCodeRegion = _bundle.default;

// Attach named exports as properties on the function
remarkCodeRegion.DEFAULT_REGION_MARKERS = _bundle.DEFAULT_REGION_MARKERS;
remarkCodeRegion.PRESET_MARKERS = _bundle.PRESET_MARKERS;
remarkCodeRegion.PRESET_STRIP = _bundle.PRESET_STRIP;
remarkCodeRegion.DEFAULT_STRIP_PATTERNS = _bundle.DEFAULT_STRIP_PATTERNS;

// Also support: const { default: codeRegion } = require(...)
remarkCodeRegion.default = remarkCodeRegion;

module.exports = remarkCodeRegion;
