import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { createDb } from '@cafeos/db';
import { createApp } from './app.js';

try {
  process.loadEnvFile(resolve(process.cwd(), '../../.env'));
} catch {
  process.loadEnvFile(resolve(process.cwd(), '.env'));
}

async function main() {
  const db = createDb(process.env.DATABASE_URL!);
  const app = createApp(db);

  // 1. Unauthenticated KDS must be rejected (401)
  const unauth = await app.request('/api/orders/kds');
  assert.equal(unauth.status, 401);

  // 2. Authenticate as owner
  const login = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'owner@cafeos.in', password: 'CafeOwner@2026' }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie')!.split(';')[0]!;

  // 3. Submit order with tampered client price (100 paise) -> server must enforce 18000 + 5% GST = 18900 paise
  const ordRes = await app.request('/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({
      clientTransactionId: crypto.randomUUID(),
      orderType: 'DINE_IN',
      items: [
        {
          productId: '11111111-1111-1111-1111-111111111101',
          productName: 'TamperedName',
          quantity: 1,
          unitPricePaise: 100,
        },
      ],
      payments: [
        { idempotencyKey: crypto.randomUUID(), method: 'CASH', amountPaise: 18900 },
      ],
    }),
  });
  assert.equal(ordRes.status, 201);
  const ordJson = (await ordRes.json()) as {
    order: { totalPaise: number; trackingToken: string; orderNumber: string };
  };
  assert.equal(ordJson.order.totalPaise, 18900);

  // 4. Public high-entropy tracking token lookup (no PII exposed)
  const trackRes = await app.request(`/api/orders/track/${ordJson.order.trackingToken}`);
  assert.equal(trackRes.status, 200);
  const trackJson = (await trackRes.json()) as { order: { kdsStatus: string } };
  assert.equal(trackJson.order.kdsStatus, 'NEW');

  // 5. Accounting summary reflects sale
  const acctRes = await app.request('/api/accounting/summary', { headers: { cookie } });
  assert.equal(acctRes.status, 200);
  const acctJson = (await acctRes.json()) as { summary: { grossSalesPaise: number } };
  assert.ok(acctJson.summary.grossSalesPaise >= 18900);

  console.log('E2E Verification Passed:', {
    unauthStatus: unauth.status,
    orderNumber: ordJson.order.orderNumber,
    serverTotalPaise: ordJson.order.totalPaise,
    trackStatus: trackJson.order.kdsStatus,
    grossSalesPaise: acctJson.summary.grossSalesPaise,
  });
  process.exit(0);
}

main().catch((err) => {
  console.error('E2E Verification Failed:', err);
  process.exit(1);
});

