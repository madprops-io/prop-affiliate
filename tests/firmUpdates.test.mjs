import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { applyFirmUpdates, approvedTradeifyCodes, rotatableSaleCodes } from '../lib/firmUpdates.ts';

const now = Date.parse('2026-10-18T12:00:00Z');
const row = {key:'apex-50k', firm_key:'apex', eval_cost_usd:'100', discount_code:'MAD', true_cost:'', signup_url:'https://example.com/?ref=MAD'};
const patch = {key:row.key, expected:{eval_cost_usd:'100', discount_code:'MAD'}, values:{eval_cost_usd:'120'}, verifiedAt:'2026-10-18T11:00:00Z', expiresAt:'2026-10-18T17:00:00Z', source:'https://apextraderfunding.com/'};
const snapshot = (p = patch) => ({schemaVersion:1, generatedAt:patch.verifiedAt, patches:[p]});

test('verified cells update while affiliate links and true_cost are preserved', () => {
  const [result] = applyFirmUpdates([row], snapshot(), now);
  assert.equal(result.eval_cost_usd, '120');
  assert.equal(result.signup_url, row.signup_url);
  assert.equal(result.true_cost, '');
});
test('expired patches, duplicate identities and manual holds do not apply', () => {
  assert.deepEqual(applyFirmUpdates([row], snapshot({...patch, expiresAt:'2026-10-18T10:00:00Z'}), now), [row]);
  assert.deepEqual(applyFirmUpdates([row,row], snapshot(), now), [row,row]);
  const held = {...row, automation_hold:'yes'};
  assert.deepEqual(applyFirmUpdates([held], snapshot(), now), [held]);
});
test('a manual price or coupon change invalidates the patch', () => {
  for (const edited of [{...row, eval_cost_usd:'80'}, {...row, discount_code:'NEW'}]) {
    assert.deepEqual(applyFirmUpdates([edited], snapshot(), now), [edited]);
  }
});
test('unexpected columns and malformed money cannot overwrite source data', () => {
  for (const values of [{true_cost:'999'}, {signup_url:'https://bad.example'}, {eval_cost_usd:''}, {discount_pct:'110'}]) {
    assert.deepEqual(applyFirmUpdates([row], snapshot({...patch, values}), now), [row]);
  }
});
test('public sale codes can rotate while custom affiliate codes cannot', () => {
  const sale = {...row, firm_key:'tradeify', discount_code:'SEP'};
  const update = {...patch, expected:{discount_code:'SEP'}, values:{discount_code:'GEMS', discount_pct:'30'}};
  assert.equal(applyFirmUpdates([sale], snapshot(update), now)[0].discount_code, 'GEMS');
  const affiliate = {...sale, discount_code:'MAD'};
  assert.equal(applyFirmUpdates([affiliate], snapshot({...update, expected:{discount_code:'MAD'}}), now)[0].discount_code, 'MAD');
});
test('Lucid plans sharing the legacy key stay distinct by firm_key', () => {
  const lucid = [{...row, key:'lucidtrading', firm_key:'lucid-pro-25k'}, {...row, key:'lucidtrading', firm_key:'lucid-pro-50k'}];
  const update = {...patch, key:'lucid-pro-50k'};
  const result = applyFirmUpdates(lucid, snapshot(update), now);
  assert.equal(result[0].eval_cost_usd, '100');
  assert.equal(result[1].eval_cost_usd, '120');
});
test('previously approved Tradeify codes are rotatable (synced with collect.py)', () => {
  const approved = {schemaVersion:1, entries:[
    {key:'tradeify-growth-50k', values:{discount_code:'nov'}, approvedAt:'2026-10-31T12:00:00Z'},
    {key:'apex-50k', values:{discount_code:'APEXONLY'}, approvedAt:'2026-10-31T12:00:00Z'},
    {key:'tradeify-growth-25k', values:{discount_code:'bad code!'}, approvedAt:'2026-10-31T12:00:00Z'},
  ]};
  const codes = approvedTradeifyCodes(approved);
  assert.deepEqual(codes, ['NOV']);
  assert.ok(rotatableSaleCodes('tradeify', codes).includes('NOV'));
  assert.equal(rotatableSaleCodes('apex', codes).includes('NOV'), false);

  const sale = {...row, firm_key:'tradeify', discount_code:'NOV'};
  const update = {...patch, expected:{discount_code:'NOV'}, values:{discount_code:'DEC', discount_pct:'40'}};
  assert.equal(applyFirmUpdates([sale], snapshot(update), now, codes)[0].discount_code, 'DEC');
  // Without the approved list NOV is unknown and must be preserved (could be an affiliate code).
  assert.equal(applyFirmUpdates([sale], snapshot(update), now)[0].discount_code, 'NOV');
  // Approved Tradeify codes never make another firm's custom code rotatable.
  const apex = {...row, discount_code:'NOV'};
  assert.equal(applyFirmUpdates([apex], snapshot(update), now, codes)[0].discount_code, 'NOV');
  // The MadProps affiliate code is still never rotated.
  const mad = {...sale, discount_code:'MAD'};
  assert.equal(applyFirmUpdates([mad], snapshot({...update, expected:{discount_code:'MAD'}}), now, codes)[0].discount_code, 'MAD');
});
test('approved Tradeify codes are read from the committed approved-firm-data.json', () => {
  const approved = JSON.parse(readFileSync(new URL('../data/approved-firm-data.json', import.meta.url), 'utf8'));
  const expected = new Set(approved.entries
    .filter((e) => e.key.startsWith('tradeify-') && /^[A-Za-z0-9_-]{1,40}$/.test(e.values?.discount_code ?? ''))
    .map((e) => e.values.discount_code.toUpperCase()));
  assert.deepEqual(new Set(approvedTradeifyCodes(approved)), expected);
  assert.deepEqual(approvedTradeifyCodes(null), []);
  assert.deepEqual(approvedTradeifyCodes({}), []);
});
