// Runs every *.test.mjs under the plugin with node:test. Node 20 has no glob support in `--test`.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['plugins/sdd/scripts/test', 'plugins/sdd/hooks/test'].filter((d) => fs.existsSync(d));
const files = roots.flatMap((d) => fs.readdirSync(d).filter((f) => f.endsWith('.test.mjs')).map((f) => path.join(d, f)));
if (!files.length) {
  console.log('no test files yet');
  process.exit(0);
}
const r = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(r.status ?? 1);
