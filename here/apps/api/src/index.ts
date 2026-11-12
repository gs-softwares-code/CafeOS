import { resolve } from 'node:path';
import { serve } from '@hono/node-server';
import { createDb } from '@cafeos/db';
import { createApp } from './app.js';

try {
  process.loadEnvFile(resolve(process.cwd(), '.env'));
} catch {
  try {
    process.loadEnvFile(resolve(process.cwd(), '../../.env'));
  } catch {
    // Env vars already provided by host environment
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.warn('Warning: DATABASE_URL is not set. Database queries will fail until configured.');
}

const db = createDb(databaseUrl ?? 'postgresql://localhost:5432/cafeos');
const app = createApp(db);

const port = Number(process.env.PORT ?? 4000);
console.log(`CafeOS API listening on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

