import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema/index.js';

const scryptAsync = promisify(scrypt);

async function hashSecret(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(plain, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run seed');
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  const businessId = '00000000-0000-0000-0000-000000000001';
  const branchId = '00000000-0000-0000-0000-000000000001';

  await db
    .insert(schema.businesses)
    .values({
      id: businessId,
      name: 'CafeOS Roastery',
      legalName: 'CafeOS Hospitality Pvt Ltd',
      phone: '+91 98765 43210',
      email: 'owner@cafeos.in',
      address: '100 Feet Road, Indiranagar, Bengaluru 560038',
      currency: 'INR',
    })
    .onConflictDoNothing();

  await db
    .insert(schema.branches)
    .values({
      id: branchId,
      businessId,
      name: 'Indiranagar Flagship',
      code: 'BLR-01',
      address: '100 Feet Road, Indiranagar, Bengaluru 560038',
      phone: '+91 98765 43210',
      stateCode: '29',
    })
    .onConflictDoNothing();

  await db
    .insert(schema.taxConfigs)
    .values({
      branchId,
      scheme: 'REGULAR',
      taxMode: 'EXCLUSIVE',
      defaultGstRateBps: 500,
    })
    .onConflictDoNothing();

  const ownerPass = await hashSecret('CafeOwner@2026');
  const staffPass = await hashSecret('CafeStaff@2026');
  const ownerPin = await hashSecret('1111');
  const cashierPin = await hashSecret('2222');
  const kitchenPin = await hashSecret('3333');

  await db
    .insert(schema.users)
    .values([
      {
        id: '00000000-0000-0000-0000-000000000101',
        branchId,
        name: 'Asha (Owner)',
        email: 'owner@cafeos.in',
        passwordHash: ownerPass,
        pinHash: ownerPin,
        role: 'owner',
      },
      {
        id: '00000000-0000-0000-0000-000000000102',
        branchId,
        name: 'Rohan (Cashier)',
        email: 'cashier@cafeos.in',
        passwordHash: staffPass,
        pinHash: cashierPin,
        role: 'cashier',
      },
      {
        id: '00000000-0000-0000-0000-000000000103',
        branchId,
        name: 'Meera (Kitchen)',
        email: 'kitchen@cafeos.in',
        passwordHash: staffPass,
        pinHash: kitchenPin,
        role: 'kitchen',
      },
    ])
    .onConflictDoNothing();

  const catCoffee = '22222222-2222-2222-2222-222222222201';
  const catCold = '22222222-2222-2222-2222-222222222202';
  const catBakery = '22222222-2222-2222-2222-222222222203';
  const catFood = '22222222-2222-2222-2222-222222222204';

  await db
    .insert(schema.categories)
    .values([
      { id: catCoffee, branchId, name: 'Hot Espresso & Classics', sortOrder: 1 },
      { id: catCold, branchId, name: 'Cold Brew & Iced', sortOrder: 2 },
      { id: catBakery, branchId, name: 'Artisanal Bakery', sortOrder: 3 },
      { id: catFood, branchId, name: 'All-Day Sandwiches', sortOrder: 4 },
    ])
    .onConflictDoUpdate({
      target: schema.categories.id,
      set: { name: schema.categories.name, sortOrder: schema.categories.sortOrder },
    });

  const menuProducts = [
      {
        id: '11111111-1111-1111-1111-111111111101',
        branchId,
        categoryId: catCoffee,
        name: 'Cappuccino',
        description: 'Double espresso with velvety steamed microfoam',
        imageUrl: '/images/menu/cappuccino.jpg',
        pricePaise: 22000,
        gstRateBps: 500,
        isVeg: true,
        isFeatured: true,
      },
      {
        id: '11111111-1111-1111-1111-111111111102',
        branchId,
        categoryId: catCoffee,
        name: 'Single-Origin Pour Over',
        description: 'Hand-brewed Chikmagalur Arabica V60',
        imageUrl: '/images/menu/pour-over.jpg',
        pricePaise: 22000,
        gstRateBps: 500,
        isVeg: true,
        isFeatured: true,
      },
      {
        id: '11111111-1111-1111-1111-111111111105',
        branchId,
        categoryId: catCoffee,
        name: 'Flat White',
        description: 'Rich ristretto shots with silky steamed milk',
        imageUrl: '/images/menu/cappuccino.jpg',
        pricePaise: 23000,
        gstRateBps: 500,
        isVeg: true,
        isFeatured: false,
      },
      {
        id: '11111111-1111-1111-1111-111111111106',
        branchId,
        categoryId: catCoffee,
        name: 'Sea Salt Mocha',
        description: 'Espresso, dark Belgian chocolate & flaky sea salt',
        imageUrl: '/images/menu/cappuccino.jpg',
        pricePaise: 28000,
        gstRateBps: 500,
        isVeg: true,
        isFeatured: true,
      },
      {
        id: '11111111-1111-1111-1111-111111111107',
        branchId,
        categoryId: catCold,
        name: 'Classic Cold Brew',
        description: '18-hour slow-steeped smooth specialty coffee',
        imageUrl: '/images/menu/cold-brew.jpg',
        pricePaise: 27000,
        gstRateBps: 500,
        isVeg: true,
        isFeatured: true,
      },
      {
        id: '11111111-1111-1111-1111-111111111108',
        branchId,
        categoryId: catCold,
        name: 'Citrus Orange Cold Brew',
        description: 'Slow-steeped cold brew over fresh Valencia orange juice',
        imageUrl: '/images/menu/citrus-cold-brew.jpg',
        pricePaise: 29000,
        gstRateBps: 500,
        isVeg: true,
        isFeatured: true,
      },
      {
        id: '11111111-1111-1111-1111-111111111109',
        branchId,
        categoryId: catCold,
        name: 'Spanish Iced Latte',
        description: 'Double espresso, chilled milk & sweet condensed milk',
        imageUrl: '/images/menu/cold-brew.jpg',
        pricePaise: 31000,
        gstRateBps: 500,
        isVeg: true,
        isFeatured: false,
      },
      {
        id: '11111111-1111-1111-1111-111111111110',
        branchId,
        categoryId: catCold,
        name: 'Iced Americano',
        description: 'Double espresso pulled over crystal ice',
        imageUrl: '/images/menu/cold-brew.jpg',
        pricePaise: 20000,
        gstRateBps: 500,
        isVeg: true,
        isFeatured: false,
      },
      {
        id: '11111111-1111-1111-1111-111111111103',
        branchId,
        categoryId: catBakery,
        name: 'French Butter Croissant',
        description: 'Flaky laminated pastry baked fresh every morning',
        imageUrl: '/images/menu/croissant.jpg',
        pricePaise: 21000,
        gstRateBps: 500,
        isVeg: true,
        isFeatured: true,
      },
      {
        id: '11111111-1111-1111-1111-111111111111',
        branchId,
        categoryId: catBakery,
        name: 'Almond Butter Croissant',
        description: 'Twice-baked croissant with roasted almond frangipane',
        imageUrl: '/images/menu/croissant.jpg',
        pricePaise: 24000,
        gstRateBps: 500,
        isVeg: true,
        isFeatured: false,
      },
      {
        id: '11111111-1111-1111-1111-111111111104',
        branchId,
        categoryId: catFood,
        name: 'Peri Peri Paneer Sourdough',
        description: 'Grilled cottage cheese, roasted peppers & herb mayo',
        imageUrl: '/images/menu/paneer-sandwich.jpg',
        pricePaise: 33000,
        gstRateBps: 500,
        isVeg: true,
        isFeatured: true,
      },
      {
        id: '11111111-1111-1111-1111-111111111112',
        branchId,
        categoryId: catFood,
        name: 'Smoked Chicken & Pesto Panini',
        description: 'Basil pesto, mozzarella & smoked chicken on sourdough',
        imageUrl: '/images/menu/paneer-sandwich.jpg',
        pricePaise: 38000,
        gstRateBps: 500,
        isVeg: false,
        isFeatured: false,
      },
  ];

  for (const p of menuProducts) {
    await db
      .insert(schema.products)
      .values(p)
      .onConflictDoUpdate({
        target: schema.products.id,
        set: {
          categoryId: p.categoryId,
          name: p.name,
          description: p.description,
          imageUrl: p.imageUrl,
          pricePaise: p.pricePaise,
          isVeg: p.isVeg,
          isFeatured: p.isFeatured,
        },
      });
  }

  await db
    .insert(schema.cafeTables)
    .values([
      { id: '33333333-3333-3333-3333-333333333301', branchId, label: 'T1', capacity: 2, qrToken: 'blr01-t1' },
      { id: '33333333-3333-3333-3333-333333333302', branchId, label: 'T2', capacity: 4, qrToken: 'blr01-t2' },
      { id: '33333333-3333-3333-3333-333333333303', branchId, label: 'T3', capacity: 4, qrToken: 'blr01-t3' },
    ])
    .onConflictDoNothing();

  // Chart of Accounts (Double-Entry)
  await db
    .insert(schema.accounts)
    .values([
      { branchId, code: '1000', name: 'Cash in Hand', type: 'ASSET' },
      { branchId, code: '1010', name: 'Bank & UPI Settlement', type: 'ASSET' },
      { branchId, code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
      { branchId, code: '2100', name: 'CGST Payable', type: 'LIABILITY' },
      { branchId, code: '2110', name: 'SGST Payable', type: 'LIABILITY' },
      { branchId, code: '2120', name: 'IGST Payable', type: 'LIABILITY' },
      { branchId, code: '4000', name: 'Sales Revenue', type: 'REVENUE' },
      { branchId, code: '5000', name: 'Purchases & COGS', type: 'EXPENSE' },
      { branchId, code: '5100', name: 'Operating Expenses', type: 'EXPENSE' },
    ])
    .onConflictDoNothing();

  // Sample Ingredients, Inventory & Recipes
  const ingBeans = '44444444-4444-4444-4444-444444444401';
  const ingMilk = '44444444-4444-4444-4444-444444444402';

  await db
    .insert(schema.ingredients)
    .values([
      { id: ingBeans, branchId, name: 'Espresso Beans', unit: 'g', lowStockThreshold: '500.000', avgCostPerUnitPaise: 120 },
      { id: ingMilk, branchId, name: 'Whole Milk', unit: 'ml', lowStockThreshold: '2000.000', avgCostPerUnitPaise: 7 },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.inventory)
    .values([
      { id: '55555555-5555-5555-5555-555555555501', branchId, ingredientId: ingBeans, currentQty: '5000.000' },
      { id: '55555555-5555-5555-5555-555555555502', branchId, ingredientId: ingMilk, currentQty: '10000.000' },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.recipes)
    .values([
      { id: '66666666-6666-6666-6666-666666666601', productId: '11111111-1111-1111-1111-111111111101', ingredientId: ingBeans, quantityRequired: '18.000' },
      { id: '66666666-6666-6666-6666-666666666602', productId: '11111111-1111-1111-1111-111111111101', ingredientId: ingMilk, quantityRequired: '180.000' },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.suppliers)
    .values([
      { id: '77777777-7777-7777-7777-777777777701', branchId, name: 'Chikmagalur Estate Roasters', contactName: 'Vikram Rao', phone: '+91 98450 11223' },
    ])
    .onConflictDoNothing();

  console.log('Seeded CafeOS initial business, branch, staff, menu, tables, accounts, ingredients, and recipes.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

