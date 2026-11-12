import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateLineTax, formatInr } from './gst.js';
import { hasPermission } from './rbac.js';
import { assertBalancedJournal } from './accounting.js';

describe('GST calculation', () => {
  it('computes 5% exclusive intra-state GST correctly in integer paise', () => {
    const res = calculateLineTax(
      { unitPricePaise: 20000, quantity: 2, gstRateBps: 500 },
      { scheme: 'REGULAR', taxMode: 'EXCLUSIVE' }
    );
    assert.equal(res.subtotalPaise, 40000);
    assert.equal(res.cgstPaise, 1000);
    assert.equal(res.sgstPaise, 1000);
    assert.equal(res.igstPaise, 0);
    assert.equal(res.totalTaxPaise, 2000);
    assert.equal(res.lineTotalPaise, 42000);
  });

  it('computes 5% inclusive GST correctly without float drift', () => {
    const res = calculateLineTax(
      { unitPricePaise: 10500, quantity: 1, gstRateBps: 500 },
      { scheme: 'REGULAR', taxMode: 'INCLUSIVE' }
    );
    assert.equal(res.taxableValuePaise, 10000);
    assert.equal(res.totalTaxPaise, 500);
    assert.equal(res.lineTotalPaise, 10500);
  });

  it('charges zero tax for COMPOSITION or UNREGISTERED schemes', () => {
    const res = calculateLineTax(
      { unitPricePaise: 15000, quantity: 1, gstRateBps: 500 },
      { scheme: 'COMPOSITION', taxMode: 'EXCLUSIVE' }
    );
    assert.equal(res.totalTaxPaise, 0);
    assert.equal(res.lineTotalPaise, 15000);
  });

  it('formats paise in INR', () => {
    assert.match(formatInr(12550), /125\.50/);
  });
});

describe('RBAC permissions', () => {
  it('grants owner all permissions and restricts cashier from accounting', () => {
    assert.equal(hasPermission('owner', 'backups:manage'), true);
    assert.equal(hasPermission('cashier', 'pos:bill'), true);
    assert.equal(hasPermission('cashier', 'accounting:write'), false);
    assert.equal(hasPermission('kitchen', 'kds:update'), true);
    assert.equal(hasPermission('kitchen', 'pos:refund'), false);
    assert.equal(hasPermission('inventory_manager', 'purchase:receive'), true);
    assert.equal(hasPermission('inventory_manager', 'accounting:write'), false);
    assert.equal(hasPermission('accountant', 'accounting:close_day'), true);
    assert.equal(hasPermission('owner', 'platform:manage'), false);
    assert.equal(hasPermission('platform_admin', 'platform:manage'), true);
  });
});

describe('Double-entry journal validation', () => {
  it('accepts balanced debit and credit lines', () => {
    const res = assertBalancedJournal([
      { accountCode: '1000', debitPaise: 10500, creditPaise: 0 },
      { accountCode: '4000', debitPaise: 0, creditPaise: 10000 },
      { accountCode: '2100', debitPaise: 0, creditPaise: 250 },
      { accountCode: '2110', debitPaise: 0, creditPaise: 250 },
    ]);
    assert.equal(res.totalDebitPaise, 10500);
    assert.equal(res.totalCreditPaise, 10500);
  });

  it('rejects unbalanced journal entries', () => {
    assert.throws(() => {
      assertBalancedJournal([
        { accountCode: '1000', debitPaise: 10000, creditPaise: 0 },
        { accountCode: '4000', debitPaise: 0, creditPaise: 9000 },
      ]);
    }, /Unbalanced journal entry/);
  });
});

