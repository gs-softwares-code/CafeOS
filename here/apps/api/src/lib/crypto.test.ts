import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashSecret, verifySecret, signSessionToken, verifySessionToken } from './crypto.js';

describe('Crypto & Session Security', () => {
  it('hashes and verifies passwords and PINs safely', async () => {
    const hash = await hashSecret('4829');
    assert.equal(await verifySecret('4829', hash), true);
    assert.equal(await verifySecret('1234', hash), false);
  });

  it('signs and verifies session tokens and rejects tampered tokens', () => {
    const secret = 'test-secret-key-at-least-32-chars-long';
    const token = signSessionToken(
      { userId: 'u1', branchId: 'b1', role: 'owner', name: 'Asha' },
      secret
    );
    const verified = verifySessionToken(token, secret);
    assert.ok(verified);
    assert.equal(verified.role, 'owner');

    const tampered = token.slice(0, -4) + 'XXXX';
    assert.equal(verifySessionToken(tampered, secret), null);
  });
});

