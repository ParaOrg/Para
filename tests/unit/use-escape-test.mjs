// Which Escape a sheet closes on (src/shared/hooks/use-escape.ts): not one a handler nearer the
// key has already taken, nor one pressed in a field with a list of its own, such as place search,
// whose Escape clears the field and must not also close the card behind it.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/use-escape-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Node has no DOM: a stand-in Element with a role and a parent, enough for `closest`.
class StandIn {
  constructor(role = null, parent = null) {
    this.role = role;
    this.parent = parent;
  }
  closest(selector) {
    assert.equal(selector, '[role="combobox"]');
    for (let at = this; at; at = at.parent) if (at.role === 'combobox') return at;
    return null;
  }
}
globalThis.Element = StandIn;
const { isEscapeToClose } = await import('../../src/shared/hooks/use-escape.ts');

const page = new StandIn();
const key = (over = {}) => ({ key: 'Escape', defaultPrevented: false, target: page, ...over });

test('Escape pressed on the page, or inside a sheet, closes it', () => {
  assert.equal(isEscapeToClose(key()), true);
  assert.equal(isEscapeToClose(key({ target: new StandIn('dialog', page) })), true);
  assert.equal(isEscapeToClose(key({ target: null })), true);
});

test('another key closes nothing', () => {
  assert.equal(isEscapeToClose(key({ key: 'Enter' })), false);
});

test('an Escape a nearer handler has taken is left to it', () => {
  assert.equal(isEscapeToClose(key({ defaultPrevented: true })), false);
});

test("an Escape pressed in a field with a list of its own is the field's", () => {
  const field = new StandIn('combobox', page);
  assert.equal(isEscapeToClose(key({ target: field })), false);
  // And in anything inside it.
  assert.equal(isEscapeToClose(key({ target: new StandIn(null, field) })), false);
});
