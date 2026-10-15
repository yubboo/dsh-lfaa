import { readFile, readdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, sep } from 'node:path';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const readJson = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const fail = message => { throw new Error(message); };
const packageEntries = (await readdir(resolve(root, 'packages'), { withFileTypes: true })).filter(entry => entry.isDirectory());
const packages = new Map();
for (const entry of packageEntries) {
  const manifest = await readJson(`packages/${entry.name}/package.json`);
  if (!/^dsh-[a-z0-9-]+$/.test(entry.name) || manifest.name !== entry.name) fail(`Package directory/name must match and start with dsh-: ${entry.name}`);
  if (packages.has(manifest.name)) fail(`Duplicate package ${manifest.name}`);
  packages.set(manifest.name, manifest);
  for (const file of ['README.md', 'README.zh.md']) await access(resolve(root, 'packages', entry.name, file));
  for (const forbidden of ['dist', 'build', 'lib', 'target']) {
    if ((await readdir(resolve(root, 'packages', entry.name))).includes(forbidden)) fail(`Source package contains output: ${entry.name}/${forbidden}`);
  }
}
for (const manifest of packages.values()) {
  for (const [name, version] of Object.entries(manifest.dependencies ?? {})) {
    if (!packages.has(name)) fail(`Undeclared implementation dependency ${name}`);
    if (packages.get(name).version !== version) fail(`Private dependency version mismatch: ${name}`);
  }
}
const pairs = [
  ['README.md', 'README.zh.md'], ['AGENTS.md', 'AGENTS.zh.md'], ['DEVELOPMENT.md', '开发规范.md'],
  ...['README', 'architecture', 'extension-points', 'validation'].map(name => [`docs/${name}.md`, `docs/${name}.zh.md`]),
  ...['packages', 'scripts', 'tests'].map(name => [`${name}/README.md`, `${name}/README.zh.md`]),
];
for (const pair of pairs) for (const file of pair) await access(resolve(root, file));

async function checkMarkdown(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) { await checkMarkdown(path); continue; }
    if (!entry.name.endsWith('.md')) continue;
    const text = await readFile(path, 'utf8');
    if (!text.endsWith('\n') || /[\t ]+$/m.test(text)) fail(`Document whitespace: ${relative(root, path)}`);
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^[a-z]+:/i.test(target) || target.startsWith('#')) continue;
      const local = resolve(dirname(path), decodeURIComponent(target.split('#')[0]));
      if (!local.startsWith(root + sep) && local !== root) fail(`Documentation link escapes project: ${target}`);
      try { await access(local); } catch { fail(`Broken link in ${relative(root, path)}: ${target}`); }
    }
  }
}
await checkMarkdown(root);
const distribution = await readJson('dist/packages/dsh-lfaa/package.json');
if (distribution.name !== 'dsh-lfaa' || distribution.dependencies) fail('Distribution must contain the public plugin without private dependencies');
for (const entry of Object.values(distribution.exports)) await access(resolve(root, 'dist/packages/dsh-lfaa', entry));
await access(resolve(root, 'dist/packages/dsh-lfaa', distribution.dsh.bundle.patch));
console.log(`PASS: ${packages.size} dsh- packages, dependencies, bilingual docs, links and distribution exports.`);
