import assert from 'node:assert/strict';
import test from 'node:test';
import { applyApprovedUpdates } from '../lib/approvedUpdates.ts';

const now = Date.parse('2026-10-31T15:00:00Z');
const row = { key: 'tradeify-growth-25k', firm_key: 'tradeify',
  eval_cost_usd: '99', discount_code: 'SEP', discount_pct: '50',
  discounted_eval_usd: '', signup_url: 'https://example.com/ref',
  true_cost: '' };
const entry = { key: row.key, approvedAt: '2026-10-31T12:00:00Z',
  promotionExpiresAt: '2026-11-01T04:00:00Z',
  values: { discount_code: 'GEMS', discount_pct: '30', eval_cost_usd: '105' } };
const data = (entries = [entry]) => ({schemaVersion: 1, entries});

test('approved base and active promotion persist without modifying affiliate links', () => {
  const [r] = applyApprovedUpdates([row], [row], data(), now);
  assert.equal(r.eval_cost_usd, '105');
  assert.equal(r.discount_code, 'GEMS');
  assert.equal(r.discount_pct, '30');
  assert.equal(r.signup_url, row.signup_url);
  assert.equal(r.true_cost, '');
});
test('expired promotion clears old Sheet coupon but keeps approved base', () => {
  const [r] = applyApprovedUpdates([row], [row], data(), Date.parse('2026-11-02T00:00:00Z'));
  assert.equal(r.eval_cost_usd, '105');
  assert.equal(r.discount_code, '');
  assert.equal(r.discount_pct, '0');
  assert.equal(r.discounted_eval_usd, '');
});
test('fresh verified values override older approvals', () => {
  const verified = {...row, eval_cost_usd: '120', discount_code: 'NEW'};
  const [r] = applyApprovedUpdates([row], [verified], data(), now);
  assert.equal(r.eval_cost_usd, '120');
  assert.equal(r.discount_code, 'NEW');
});
test('holds, duplicate identities, and unknown fields cannot change data', () => {
  assert.deepEqual(applyApprovedUpdates([{...row,automation_hold:'yes'}], [{...row,automation_hold:'yes'}], data(), now)[0],
    {...row,automation_hold:'yes'});
  assert.deepEqual(applyApprovedUpdates([row,row], [row,row], data(), now), [row,row]);
  const [r] = applyApprovedUpdates([row], [row], data([{...entry,values:{signup_url:'evil',true_cost:'100'}}]), now);
  assert.deepEqual(r,row);
});
test('a promotion without a real expiration is never approved', () => {
  const [r] = applyApprovedUpdates([row], [row], data([{...entry,promotionExpiresAt:undefined}]), now);
  assert.equal(r.discount_code,'SEP');
});
