import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('public debug-env endpoint is removed entirely', () => {
  assert.equal(existsSync(new URL('app/api/debug-env/route.ts', root)), false);
  assert.equal(existsSync(new URL('app/api/debug-env', root)), false);
});

test('/api/firms no longer honours ?raw=1 or ?debug=1 debug modes', () => {
  const source = readFileSync(new URL('app/api/firms/route.ts', root), 'utf8');
  assert.doesNotMatch(source, /searchParams\.get\(\s*["'](raw|debug)["']\s*\)/);
  assert.doesNotMatch(source, /parseErrors|sheetColumns/);
});
