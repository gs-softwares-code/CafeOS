import { z } from 'zod';
import { ROLES } from './rbac.js';

export const ORDER_TYPES = ['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'QR_DINE_IN'] as const;
export const KDS_STATUSES = ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'] as const;
export const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'RAZORPAY_ONLINE', 'WALLET'] as const;
export const PAYMENT_STATUSES = ['PENDING', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIAL'] as const;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const pinLoginSchema = z.object({
  branchId: z.string().uuid(),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits'),
});

export const createUserSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(8).max(20).optional(),
  password: z.string().min(8),
  pin: z.string().regex(/^\d{4,6}$/).optional(),
  role: z.enum(ROLES),
});

export const orderItemInputSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPricePaise: z.number().int().nonnegative(),
  discountPaise: z.number().int().nonnegative().default(0),
  gstRateBps: z.number().int().nonnegative().default(500),
  modifiers: z
    .array(
      z.object({
        modifierId: z.string().uuid(),
        name: z.string(),
        pricePaise: z.number().int().nonnegative(),
      })
    )
    .default([]),
  notes: z.string().max(300).optional(),
});

export const createOrderSchema = z.object({
  clientTransactionId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  tableId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  orderType: z.enum(ORDER_TYPES),
  items: z.array(orderItemInputSchema).min(1),
  notes: z.string().max(500).optional(),
  isOfflineCreated: z.boolean().default(false),
  offlineCreatedAt: z.string().datetime().optional(),
  payments: z
    .array(
      z.object({
        idempotencyKey: z.string().uuid(),
        method: z.enum(PAYMENT_METHODS),
        amountPaise: z.number().int().positive(),
        reference: z.string().max(120).optional(),
      })
    )
    .default([]),
});

export const createIngredientSchema = z.object({
  name: z.string().min(1).max(120),
  unit: z.enum(['g', 'kg', 'ml', 'L', 'pcs']),
  lowStockThreshold: z.number().nonnegative().default(0),
  initialQty: z.number().nonnegative().default(0),
  avgCostPerUnitPaise: z.number().int().nonnegative().default(0),
});

export const createRecipeSchema = z.object({
  productId: z.string().uuid(),
  ingredientId: z.string().uuid(),
  quantityRequired: z.number().positive(),
});

export const adjustStockSchema = z.object({
  ingredientId: z.string().uuid(),
  deltaQty: z.number().refine((v) => v !== 0, 'Delta quantity cannot be zero'),
  reason: z.enum(['WASTE', 'ADJUSTMENT']),
  notes: z.string().max(300).optional(),
});

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(120),
  contactName: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  gstin: z.string().max(20).optional(),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  invoiceNumber: z.string().max(80).optional(),
  items: z
    .array(
      z.object({
        ingredientId: z.string().uuid(),
        quantity: z.number().positive(),
        unitCostPaise: z.number().int().nonnegative(),
      })
    )
    .min(1),
});

export const createExpenseSchema = z.object({
  category: z.enum(['RENT', 'UTILITIES', 'SALARY', 'SUPPLIES', 'OTHER']),
  description: z.string().min(2).max(300),
  amountPaise: z.number().int().positive(),
  paymentMode: z.enum(['CASH', 'BANK', 'UPI']).default('CASH'),
});

export const refundOrderSchema = z.object({
  amountPaise: z.number().int().positive(),
  reason: z.string().min(3).max(300),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type PinLoginInput = z.infer<typeof pinLoginSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type KdsStatus = (typeof KDS_STATUSES)[number];
export type OrderType = (typeof ORDER_TYPES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
