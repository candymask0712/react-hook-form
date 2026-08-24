/**
 * Ensure that every package export target is included in the packed tarball.
 * Checking the npm pack result catches files omitted by both the build and the
 * package files allowlist.
 */
import assert from 'assert';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '../..');
const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(packageRoot, 'package.json'), 'utf-8'),
);
const packDirectory = fs.mkdtempSync(
  path.resolve(os.tmpdir(), 'react-hook-form-pack-'),
);

const collectTargets = (exports) => {
  if (typeof exports === 'string') {
    return [exports];
  }

  if (Array.isArray(exports)) {
    return exports.flatMap(collectTargets);
  }

  if (exports && typeof exports === 'object') {
    return Object.values(exports).flatMap(collectTargets);
  }

  return [];
};

const escapeRegExp = (value) =>
  value.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*');

try {
  const packOutput = execFileSync(
    'npm',
    ['pack', '--json', '--ignore-scripts', '--pack-destination', packDirectory],
    {
      cwd: packageRoot,
      encoding: 'utf-8',
      env: {
        ...process.env,
        HUSKY: '0',
        npm_config_cache: path.resolve(packDirectory, 'npm-cache'),
      },
    },
  );
  const jsonStart = packOutput.indexOf('[');

  assert.notStrictEqual(jsonStart, -1, 'npm pack did not return JSON output');

  const [packResult] = JSON.parse(packOutput.slice(jsonStart));
  const packedFiles = new Set(packResult.files.map((file) => file.path));

  for (const target of new Set(collectTargets(packageJson.exports))) {
    assert.ok(
      target.startsWith('./'),
      `Package export target must start with "./": ${target}`,
    );

    const packedPath = target.slice(2);

    if (packedPath.includes('*')) {
      const pattern = new RegExp(`^${escapeRegExp(packedPath)}$`);

      assert.ok(
        [...packedFiles].some((file) => pattern.test(file)),
        `Package export pattern is missing from npm pack: ${target}`,
      );
    } else {
      assert.ok(
        packedFiles.has(packedPath),
        `Package export target is missing from npm pack: ${target}`,
      );
    }
  }
} finally {
  fs.rmSync(packDirectory, { force: true, recursive: true });
}
