// No third-party packages required. Run each suite in its own process so prototype patches are isolated.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const suites = fs.readdirSync(__dirname).filter(file => file.endsWith('.cjs') && file !== 'run.cjs' && file !== 'browser.cjs').sort();
for (const suite of suites) {
  const result = spawnSync(process.execPath, [path.join(__dirname, suite)], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`PASS ${suites.length} suites`);
