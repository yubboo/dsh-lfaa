import { build } from 'esbuild';
import { mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('packages/dsh-lfaa/package.json', root), 'utf8'));
const output = new URL('dist/packages/dsh-lfaa/', root);
await mkdir(output, { recursive: true });
await build({ entryPoints: [fileURLToPath(new URL('packages/dsh-lfaa/src/index.mjs', root))], outfile: fileURLToPath(new URL('index.mjs', output)), bundle: true, platform: 'node', format: 'esm', external: ['@deepseek-ai/*'] });
await build({
  entryPoints: [fileURLToPath(new URL('packages/dsh-lfaa-workspace/src/index.jsx', root))],
  outfile: fileURLToPath(new URL('client.js', output)),
  bundle: true, platform: 'browser', format: 'cjs', jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', '@deepseek-ai/dsh-client-ui-primitives'],
  banner: { js: `window.__ModuleLoader__.load({id:${JSON.stringify(manifest.name)},factory:(require)=>{var module={exports:{}};var exports=module.exports;` },
  footer: { js: 'return module.exports;}});' },
  loader: { '.css': 'text' },
});
// Private implementation packages are bundled; no workspace protocol or source
// package dependency is allowed to escape into the installable artifact.
const { dependencies, ...distribution } = manifest;
await writeFile(new URL('package.json', output), JSON.stringify(distribution, null, 2) + '\n');
await copyFile(new URL('packages/dsh-lfaa/cordis.patch.yml', root), new URL('cordis.patch.yml', output));
for (const file of ['README.md', 'README.zh.md']) await copyFile(new URL(`packages/dsh-lfaa/${file}`, root), new URL(file, output));
await mkdir(new URL('docs/', output), { recursive: true });
for (const name of ['architecture', 'extension-points', 'validation']) {
  for (const suffix of ['.md', '.zh.md']) await copyFile(new URL(`docs/${name}${suffix}`, root), new URL(`docs/${name}${suffix}`, output));
}
// Remove only this builder's obsolete navigation copies; source navigation stays
// in the workspace and does not link to unshipped development files at runtime.
for (const file of ['docs/README.md', 'docs/README.zh.md']) await rm(new URL(file, output), { force: true });
console.log('Built installable plugin in dist/packages/dsh-lfaa/.');
