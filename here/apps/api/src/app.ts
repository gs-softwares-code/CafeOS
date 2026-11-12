import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Database } from '@cafeos/db';
import { createAuthRoutes } from './routes/auth.js';
import { createMenuRoutes } from './routes/menu.js';
import { createOrderRoutes } from './routes/orders.js';
import { createInventoryRoutes } from './routes/inventory.js';
import { createProcurementRoutes } from './routes/procurement.js';
import { createAccountingRoutes } from './routes/accounting.js';

export function createApp(db: Database) {
  const app = new Hono();

  app.use(
    '/api/*',
    cors({
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
      credentials: true,
    })
  );

  app.get('/api/health', (c) => {
    return c.json({
      status: 'ok',
      service: 'cafeos-api',
      timestamp: new Date().toISOString(),
    });
  });

  app.route('/api/auth', createAuthRoutes(db));
  app.route('/api/menu', createMenuRoutes(db));
  app.route('/api/orders', createOrderRoutes(db));
  app.route('/api/inventory', createInventoryRoutes(db));
  app.route('/api/procurement', createProcurementRoutes(db));
  app.route('/api/accounting', createAccountingRoutes(db));

  app.onError((err, c) => {
    console.error('[API Error]', err);
    return c.json({ error: 'Internal server error' }, 500);
  });

  return app;
}
