import assert from 'node:assert/strict';
import test from 'node:test';
import { applyFirmUpdates, isAffiliateCode } from '../lib/firmUpdates.ts';

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
test('any non-affiliate code is replaced by the verified public code', () => {
  for (const current of ['SEP', 'BG25', 'CLUB', '']) {
    const sale = {...row, firm_key:'tradeify', discount_code:current};
    const update = {...patch, expected:{discount_code:current}, values:{discount_code:'GEMS', discount_pct:'30'}};
    const [result] = applyFirmUpdates([sale], snapshot(update), now);
    assert.equal(result.discount_code, 'GEMS', `replaces ${current || 'blank'}`);
    assert.equal(result.discount_pct, '30');
  }
});
test('a verified code-less discount clears a non-affiliate code but never an affiliate code', () => {
  const sale = {...row, firm_key:'aquafutures', discount_code:'BACK2WORK', discount_pct:'25'};
  const update = {...patch, expected:{discount_code:'BACK2WORK'}, values:{discount_code:'', discount_pct:'35', discounted_eval_usd:''}};
  const [result] = applyFirmUpdates([sale], snapshot(update), now);
  assert.equal(result.discount_code, '');
  assert.equal(result.discount_pct, '35');
  const affiliate = {...sale, discount_code:'MADPROPS'};
  const clear = {...update, expected:{discount_code:'MADPROPS'}};
  assert.deepEqual(applyFirmUpdates([affiliate], snapshot(clear), now)[0], affiliate);
  for (const bad of [' ', 'BAD CODE', 'x'.repeat(41)]) {
    assert.deepEqual(applyFirmUpdates([sale], snapshot({...update, values:{discount_code:bad}}), now)[0], sale);
  }
});
test('MAD and MADPROPS affiliate codes are never replaced but take the promotion discount', () => {
  for (const code of ['MAD', 'MADPROPS', 'madprops']) {
    const affiliate = {...row, discount_code:code};
    const swap = {...patch, expected:{discount_code:code}, values:{discount_code:'GEMS', discount_pct:'30'}};
    assert.deepEqual(applyFirmUpdates([affiliate], snapshot(swap), now)[0], affiliate, `${code} kept, patch rejected`);
    const keep = {...patch, expected:{discount_code:code}, values:{discount_code:code, discount_pct:'30'}};
    const [result] = applyFirmUpdates([affiliate], snapshot(keep), now);
    assert.equal(result.discount_code, code);
    assert.equal(result.discount_pct, '30');
  }
  assert.equal(isAffiliateCode(' mad '), true);
  assert.equal(isAffiliateCode('MADNESS'), false);
  assert.equal(isAffiliateCode(undefined), false);
});
test('Lucid plans sharing the legacy key stay distinct by firm_key', () => {
  const lucid = [{...row, key:'lucidtrading', firm_key:'lucid-pro-25k'}, {...row, key:'lucidtrading', firm_key:'lucid-pro-50k'}];
  const update = {...patch, key:'lucid-pro-50k'};
  const result = applyFirmUpdates(lucid, snapshot(update), now);
  assert.equal(result[0].eval_cost_usd, '100');
  assert.equal(result[1].eval_cost_usd, '120');
});
