import { hashPassword } from '../src/lib/auth/customer-session';

async function main() {
  const ownerHash = await hashPassword('Owner@CafeOS2026');
  const receptionHash = await hashPassword('Reception@CafeOS2026');
  console.log(`INSERT OR REPLACE INTO users (id, cafe_id, email, password_hash, full_name, role, created_at, updated_at) VALUES ('usr-owner-01', 'cafe-kurali-01', 'owner@cafeos.in', '${ownerHash}', 'Asha Verma (Owner)', 'owner', datetime('now'), datetime('now')), ('usr-reception-01', 'cafe-kurali-01', 'reception@cafeos.in', '${receptionHash}', 'Front Desk / Cashier', 'reception', datetime('now'), datetime('now'));`);
}

main();

