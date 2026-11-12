import assert from 'node:assert/strict';
import { D1Repository } from '../src/lib/db/d1.ts';

class MockD1 {
  cafes = [{ id: 'cafe-a', is_active: 1 }];
  menuItems = [
    { id: 'item-a', cafe_id: 'cafe-a', name: 'Latte', price: 425, is_available: 1 },
    { id: 'item-b', cafe_id: 'cafe-b', name: 'Tea', price: 200, is_available: 1 },
  ];
  orders = [];
  orderItems = [];

  prepare(query) {
    return this.statement(query, []);
  }

  statement(query, params) {
    return {
      bind: (...values) => this.statement(query, values),
      first: async () => {
        if (query.includes('FROM cafes')) {
          return this.cafes.find((cafe) => cafe.id === params[0] && cafe.is_active) ?? null;
        }
        return null;
      },
      all: async () => {
        if (query.includes('FROM menu_items')) {
          const [cafeId, ...ids] = params;
          return {
            success: true,
            results: this.menuItems.filter((item) => item.cafe_id === cafeId && ids.includes(item.id)),
          };
        }
        return { success: true, results: [] };
      },
      run: async () => ({ success: true, meta: { changes: 1 } }),
      query,
      params,
    };
  }

  async batch(statements) {
    for (const statement of statements) {
      if (statement.query.includes('INSERT INTO orders')) {
        this.orders.push({
          id: statement.params[0],
          cafe_id: statement.params[1],
          total: statement.params[9],
        });
      } else if (statement.query.includes('INSERT INTO order_items')) {
        this.orderItems.push({
          id: statement.params[0],
          order_id: statement.params[1],
          item_price: statement.params[4],
          quantity: statement.params[5],
          subtotal: statement.params[6],
        });
      }
    }
    return statements.map(() => ({ success: true }));
  }
}

const db = new MockD1();
const repo = new D1Repository(db);
const order = await repo.createOrder({
  cafe_id: 'cafe-a',
  customer_name: 'Test customer',
  customer_phone: '5550100',
  items: [{ menu_item_id: 'item-a', quantity: 2, price: 0.01 }],
});

assert.equal(order.total, 8.5);
assert.equal(order.items[0].item_price, 4.25);
assert.equal(db.orders[0].total, 850);
assert.equal(db.orderItems[0].item_price, 425);
assert.equal(db.orderItems[0].subtotal, 850);

await assert.rejects(
  repo.createOrder({
    cafe_id: 'cafe-a',
    customer_name: 'Test customer',
    customer_phone: '5550100',
    items: [{ menu_item_id: 'item-b', quantity: 1 }],
  }),
  /do not belong to this café/
);

await assert.rejects(
  repo.createOrder({
    cafe_id: 'cafe-a',
    customer_name: 'Test customer',
    customer_phone: '5550100',
    items: [{ menu_item_id: 'item-a', quantity: 0 }],
  }),
  /Invalid quantity/
);

console.log('D1 order pricing and tenant validation checks passed.');
