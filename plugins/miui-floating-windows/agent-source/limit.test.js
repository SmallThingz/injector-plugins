import assert from 'node:assert/strict';
import test from 'node:test';
import { FIRMWARE, limitForWindow, parseLimit, supportsFirmware } from './limit.js';

test('accepts only integer limits within the supported range', () => {
  for (const value of [3, 8, 256]) assert.equal(parseLimit(value), value);
  for (const value of [undefined, '8', 0, 2, 3.5, 257, Infinity]) {
    assert.throws(() => parseLimit(value), RangeError);
  }
});

test('accepts the inspected device, firmware and API level together', () => {
  const { device, incremental, sdk } = FIRMWARE;
  assert.ok(supportsFirmware(device, incremental, sdk));
  assert.ok(!supportsFirmware('other', incremental, sdk));
  assert.ok(!supportsFirmware(device, 'other', sdk));
  assert.ok(!supportsFirmware(device, incremental, 35));
});

test('raises only the ordinary two-window cap', () => {
  assert.equal(limitForWindow(2, 8, () => true), 8);
  assert.equal(limitForWindow(2, 8, () => false), 2);
  let checked = false;
  for (const stock of [0, 1, 4]) {
    assert.equal(limitForWindow(stock, 8, () => { checked = true; }), stock);
  }
  assert.equal(checked, false);
});

test('retains the stock cap when the window mode cannot be read', () => {
  assert.equal(limitForWindow(2, 8, () => { throw new Error('unavailable'); }), 2);
});
