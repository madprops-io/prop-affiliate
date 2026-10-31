import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { publicFirmUpdateStatus, stripUnverifiedProposals } from '../lib/firmUpdateStatus.ts';

const root = new URL('../', import.meta.url);
const now = Date.parse('2026-10-31T12:00:00Z');
const snapshot = {
  schemaVersion: 1,
  generatedAt: '2026-10-31T11:00:00Z',
  patches: [{ key: 'tradeify-growth-25k', values: { eval_cost_usd: '99' } }],
  review: [
    { key: 'tradeify-growth-50k', reason: 'Coupon not verified for existing Sheet code; pricing held',
      proposed: { eval_cost_usd: '1', discount_pct: '99' } },
    { key: 'lucid-pro-25k', reason: 'Official source unavailable' },
  ],
  coverage: { tradeify: 8 },
  sourceDiagnostics: { tradeify: { ok: true } },
  unsupportedFirms: ['apex'],
};

test('status review items never contain unverified proposed prices', () => {
  const status = publicFirmUpdateStatus(snapshot, false, now);
  assert.equal(status.review.length, 2);
  for (const item of status.review) assert.equal('proposed' in item, false);
  assert.deepEqual(status.review[0], { key: 'tradeify-growth-50k', reason: snapshot.review[0].reason });
  assert.equal(JSON.stringify(status).includes('"proposed"'), false);
});

test('the rest of the status payload is preserved for monitoring', () => {
  const status = publicFirmUpdateStatus(snapshot, true, now);
  assert.deepEqual(status.patches, snapshot.patches);
  assert.deepEqual(status.coverage, snapshot.coverage);
  assert.deepEqual(status.sourceDiagnostics, snapshot.sourceDiagnostics);
  assert.deepEqual(status.unsupportedFirms, snapshot.unsupportedFirms);
  assert.equal(status.generatedAt, snapshot.generatedAt);
  assert.equal(status.disabled, true);
  assert.equal(status.stale, false);
  assert.equal(publicFirmUpdateStatus(snapshot, false, Date.parse('2026-11-01T06:00:00Z')).stale, true);
  // The original snapshot object is not mutated.
  assert.ok('proposed' in snapshot.review[0]);
});

test('malformed review values are passed through without throwing', () => {
  assert.equal(stripUnverifiedProposals(undefined), undefined);
  assert.deepEqual(stripUnverifiedProposals([null, 'x', { key: 'a', proposed: {} }]), [null, 'x', { key: 'a' }]);
});

test('the committed collector snapshot is sanitized too', () => {
  const real = JSON.parse(readFileSync(new URL('data/firm-updates.json', root), 'utf8'));
  const status = publicFirmUpdateStatus(real, false, now);
  for (const item of status.review ?? []) assert.equal('proposed' in item, false);
});

test('the firm-data status route and firmUpdateStatus both use the sanitizer', () => {
  const route = readFileSync(new URL('app/api/firm-data/route.ts', root), 'utf8');
  const data = readFileSync(new URL('lib/firmData.ts', root), 'utf8');
  assert.match(route, /stripUnverifiedProposals\(status\.review\)/);
  assert.match(data, /publicFirmUpdateStatus\(snapshot/);
});
