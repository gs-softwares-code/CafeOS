import { neon } from '@neondatabase/serverless';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const sql = neon(databaseUrl);

  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_token text UNIQUE`;
  await sql`UPDATE orders SET tracking_token = gen_random_uuid()::text WHERE tracking_token IS NULL`;
  await sql`ALTER TABLE orders ALTER COLUMN tracking_token SET NOT NULL`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_held boolean NOT NULL DEFAULT false`;

  await sql`
    CREATE TABLE IF NOT EXISTS goods_receipts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
      invoice_number text,
      notes text,
      received_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS order_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      event_type text NOT NULL,
      from_status text,
      to_status text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS payment_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      event_type text NOT NULL,
      metadata jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      code text NOT NULL,
      name text NOT NULL,
      type text NOT NULL
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS accounts_branch_code_idx ON accounts (branch_id, code)`;

  await sql`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      reference_type text NOT NULL,
      reference_id uuid NOT NULL,
      description text NOT NULL,
      posted_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS journal_lines (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      journal_entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
      account_code text NOT NULL,
      debit_paise integer NOT NULL DEFAULT 0,
      credit_paise integer NOT NULL DEFAULT 0,
      memo text
    )
  `;

  console.log('Enterprise schema migration applied successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

