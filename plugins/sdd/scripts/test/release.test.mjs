// The released version is stated once per file and must agree everywhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const json = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

test('plugin, marketplace and changelog agree on the version', () => {
  const plugin = json('plugins/sdd/.claude-plugin/plugin.json').version;
  const entry = json('.claude-plugin/marketplace.json').plugins.find((p) => p.name === 'sdd');
  const latest = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8').match(/^## \[(\d+\.\d+\.\d+)\]/m)[1];
  assert.equal(entry.version, plugin);
  assert.equal(latest, plugin);
  assert.equal(plugin, '0.2.0');
});
