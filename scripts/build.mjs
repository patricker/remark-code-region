import { build } from 'esbuild';

const footer =
  ';(function(){var m=module.exports;var fn=m.default;Object.assign(fn,m);delete fn.default;fn.default=fn;module.exports=fn;})()';

const shared = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  footer: { js: footer },
};

await Promise.all([
  build({ ...shared, entryPoints: ['index.mjs'], outfile: 'index.cjs' }),
  build({
    ...shared,
    entryPoints: ['lib/docusaurus.mjs'],
    outfile: 'lib/docusaurus.cjs',
  }),
  build({
    ...shared,
    entryPoints: ['lib/starlight.mjs'],
    outfile: 'lib/starlight.cjs',
  }),
  build({
    ...shared,
    entryPoints: ['lib/shiki.mjs'],
    outfile: 'lib/shiki.cjs',
  }),
]);
