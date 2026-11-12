const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = fs.readdirSync(root).filter(file => /\.(?:js|html|css)$/.test(file));
const text = files.map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
const used = new Set([...text.matchAll(/assets\/([\w-]+\.(?:png|mp3))/g)].map(match => match[1]));
for (const id of ['shield', 'wisp', 'meal', 'broom', 'exercise', 'manners', 'training', 'grit']) used.add(`upgrade-${id}.png`);
for (const file of used) assert.ok(fs.existsSync(path.join(root, 'assets', file)), `Missing asset: ${file}`);
const media = fs.readdirSync(path.join(root, 'assets')).filter(file => /\.(?:png|mp3)$/.test(file));
for (const file of media) assert.ok(used.has(file), `Unreferenced asset: ${file}`);
for (const [, file] of html.matchAll(/(?:src|href)="([^"?#]+)(?:\?[^"#]*)?"/g)) {
  if (!file.startsWith('http')) assert.ok(fs.existsSync(path.join(root, file)), `Missing entrypoint dependency: ${file}`);
}
console.log(`PASS ${media.length} media files are referenced; entrypoint dependencies exist`);
