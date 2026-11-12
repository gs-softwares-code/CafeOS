# CafeOS Revised Implementation Plan

> This plan was drafted before the Stage 1 migration. See section 10 for the implementation now
> present in the repository and the remaining work before production use.

## 1. Current Architecture (Verified)

### Database Layer
- **File-based storage**: `.data/cafeos_store.json` is the primary persistence mechanism
- **Supabase**: SQL schema exists with RLS policies, but `getSupabaseAdmin()` is never called in the app layer
- **RLS policies**: Exist in SQL schema but are not enforced in the application code
- **Tenant isolation**: Enforced via `cafe_id` in all database operations

### API Layer
- **Order creation** (`POST /api/orders`): Validates `cafe_id`, checks item availability, calculates prices server-side ✅
- **Order retrieval** (`GET /api/orders?cafe_id=...`): Requires `cafe_id` parameter ✅
- **Menu management** (`GET/POST /api/menu`, `PATCH/DELETE /api/menu/[id]`): Validates `cafe_id` ✅
- **Demo reset** (`POST /api/demo/reset`): **NO AUTHENTICATION** ❌ (security vulnerability)
- **Order status update** (`PATCH /api/orders/[id]`): Requires order ID but no user authorization ✅

### Security Issues (Verified)
1. **Demo reset endpoint** has no authentication - anyone can reset demo data
2. **No user authorization**: All endpoints require `cafe_id` but don't verify the user owns that café
3. **No authentication**: No login/logout mechanism for staff or customers
4. **Order retrieval**: Can access orders by knowing `cafe_id` without proving ownership

### Next.js/Cloudflare Compatibility
- **Next.js 15** with App Router - compatible with Cloudflare Workers via OpenNext
- **File-based storage**: Must be replaced with D1 for Cloudflare deployment
- **OpenNext**: Correct adapter for this project
- **No server actions**: Currently using API routes only
- **Image optimization**: Uses `next/image` with remotePatterns for unsplash.com

## 2. Cloudflare Target Architecture

### Components
1. **Compute**: Cloudflare Workers (Next.js via OpenNext adapter)
2. **Database**: Cloudflare D1 (authoritative source of truth - Supabase must be migrated away from)
3. **Storage**: Cloudflare R2 (for images and files)
4. **Authentication**: Better Auth with D1
5. **API**: REST endpoints with proper authentication and authorization

### Key Changes Required
1. Replace file-based storage with D1
2. Implement Better Auth for staff and customer authentication
3. Enforce user-cafe ownership for all operations
4. Protect destructive endpoints (demo reset, menu delete)
5. Configure OpenNext for Cloudflare deployment
6. Migrate from Supabase to D1

## 3. D1 Schema Design

The D1 schema will mirror the current file-based structure with proper tenant isolation:

```sql
-- Cafes table
CREATE TABLE IF NOT EXISTS cafes (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    phone TEXT,
    currency TEXT DEFAULT 'INR',
    currency_symbol TEXT DEFAULT '₹',
    logo_url TEXT,
    banner_url TEXT,
    opening_time TEXT DEFAULT '08:30 AM',
    closing_time TEXT DEFAULT '11:00 PM',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    cafe_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE
);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    cafe_id TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL CHECK (price >= 0), -- stored as paise/cents
    image_url TEXT,
    is_available INTEGER NOT NULL DEFAULT 1,
    is_veg INTEGER NOT NULL DEFAULT 1,
    is_featured INTEGER NOT NULL DEFAULT 0,
    preparation_time_minutes INTEGER NOT NULL DEFAULT 10,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    cafe_id TEXT NOT NULL,
    order_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    special_instructions TEXT,
    status TEXT NOT NULL DEFAULT 'received',
    subtotal INTEGER NOT NULL DEFAULT 0 CHECK (subtotal >= 0), -- stored as paise/cents
    tax INTEGER NOT NULL DEFAULT 0 CHECK (tax >= 0), -- stored as paise/cents
    total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0), -- stored as paise/cents
    payment_status TEXT NOT NULL DEFAULT 'pending',
    dining_option TEXT NOT NULL DEFAULT 'dine_in',
    table_number TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    menu_item_id TEXT REFERENCES menu_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    item_price INTEGER NOT NULL CHECK (item_price >= 0), -- stored as paise/cents
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal INTEGER NOT NULL DEFAULT 0 CHECK (subtotal >= 0), -- stored as paise/cents
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Memberships table (for staff authentication)
CREATE TABLE IF NOT EXISTS memberships (
    id TEXT PRIMARY KEY,
    cafe_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    created_at TEXT NOT NULL,
    UNIQUE (cafe_id, user_id),
    FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE
);

-- Sessions table (for Better Auth)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    cafe_id TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE
);
```

## 4. Authentication Architecture

### Better Auth with D1

**User Roles:**
- **Platform administrator** (if required by product)
- **Café owner** - full access to their café
- **Café manager** - manage menu, orders, staff
- **Café staff** - view orders, update status
- **Customer** - place orders, track orders

**Authentication Flow:**
1. User logs in via Better Auth
2. Better Auth creates a session in D1 `sessions` table
3. API routes verify session token
4. Server resolves user's café membership
5. Operation scoped to authorized café

**Session Management:**
- Secure session persistence using D1
- Token-based authentication for API routes
- Session expiration and refresh
- Secure HTTP-only cookies for browser-based auth

## 5. API Migration Mapping

### Current → Cloudflare Migration

| Current Endpoint | New Implementation | Status |
|---|---|---|
| `GET /api/orders?cafe_id=...` | D1 query with session verification + `cafe_id` scoping | ⚠️ Needs auth |
| `POST /api/orders` | D1 transaction: validate café, check items, calculate prices, create order | ⚠️ Needs auth + D1 |
| `GET /api/orders/[id]` | D1 query with session + ownership verification | ⚠️ Needs auth |
| `PATCH /api/orders/[id]` | D1 update with session + ownership + role verification | ⚠️ Needs auth |
| `GET /api/menu?cafe_id=...` | D1 query with `cafe_id` scoping | ⚠️ Needs auth |
| `POST /api/menu` | D1 insert with `cafe_id` scoping + role verification | ⚠️ Needs auth |
| `PATCH /api/menu/[id]` | D1 update with `cafe_id` scoping + role verification | ⚠️ Needs auth |
| `DELETE /api/menu/[id]` | D1 delete with `cafe_id` scoping + role verification | ⚠️ Needs auth |
| `POST /api/demo/reset` | **PROTECTED**: Requires owner authentication + environment verification | ❌ Must fix |
| `GET /api/cafes` | D1 query with `is_active = true` | ✅ Can be public |

## 6. Android Frontend Architecture

### CafeOS Admin (com.cafeos.admin)
- **Login/Logout**: Staff authentication via Better Auth
- **Café selection**: Multi-tenant switcher (same as current DashboardHeader)
- **Dashboard**: Live orders feed, status updates
- **Kitchen workflow**: Order status transitions
- **Menu management**: Add/edit/delete menu items
- **Analytics**: Sales stats, order metrics
- **Staff management**: View/manage staff accounts

### CafeOS Customer (com.cafeos.customer)
- **Registration/Login**: Customer authentication or guest access
- **Café storefront**: Browse menus by slug
- **Menu browsing**: Category tabs, search, filters
- **Cart and checkout**: Add items, select dining option, enter special instructions
- **Order tracking**: Real-time status updates
- **Order history**: View past orders
- **Payment integration**: Where configured

### Shared Component Library
- Responsive design for mobile
- Touch-friendly interactions
- Loading and error states
- Offline handling
- Secure session storage

### Data Flow
- **Admin**: HTTPS APIs to Cloudflare Workers
- **Customer**: HTTPS APIs to Cloudflare Workers
- **Both apps**: Shared business logic, separate UI

## 7. Shared Component Architecture

### Shared Business Logic
- Type definitions (`src/lib/types.ts`)
- Database abstraction layer (to be migrated to D1)
- API client configuration
- Authentication utilities

### Shared UI Components
- Button, Input, Select components
- Card, Table layouts
- Modal dialogs
- Notification systems

### Separation of Concerns
- **Admin app**: Operational UI, staff actions
- **Customer app**: Storefront UI, ordering flow
- **Shared**: Types, utilities, API client

## 8. Build and Release Strategy

### Cloudflare Deployment
1. `pnpm build` - Build Next.js app
2. `opennext build` - Generate Cloudflare Workers output
3. `wrangler publish` - Deploy to Cloudflare
4. Configure D1 binding in `wrangler.jsonc`
5. Configure R2 binding for image storage

### Android Deployment
1. `pnpm cap sync` - Sync Capacitor configuration
2. `npx cap add android` - Add Android platform
3. Configure `android/app/build.gradle` for each app
4. Build separate APKs:
   - `npx cap run android --release --appId="com.cafeos.admin"`
   - `npx cap run android --release --appId="com.cafeos.customer"`
5. Generate separate signing keys for each app

### Environment Configuration
- **Development**: Local D1 database for testing
- **Staging**: Cloudflare D1 + staging environment
- **Production**: Cloudflare D1 + production environment

## 9. Testing and Deployment Sequence

### Phase 1: Local Development
1. Set up D1 database locally
2. Run `pnpm dev` - verify Next.js works with D1
3. Test all API routes with proper authentication
4. Verify tenant isolation works correctly

### Phase 2: Authentication Testing
1. Test Better Auth login/logout flow
2. Verify session management in D1
3. Test role-based access control
4. Verify all endpoints require proper authentication

### Phase 3: Migration Verification
1. Migrate all data from file-based to D1
2. Verify tenant isolation across cafes
3. Test order creation with price calculation
4. Test menu management operations
5. Verify demo reset is properly protected

### Phase 4: Android Testing
1. Build CafeOS Admin APK
2. Build CafeOS Customer APK
3. Test basic functionality on device/emulator
4. Verify push notification setup

### Phase 5: Production Deployment
1. Deploy to Cloudflare Workers
2. Configure production D1 database
3. Configure R2 bucket for images
4. Set up monitoring and logging
5. Release Android apps to stores

## 10. Stage 1 Implementation Status

### Implemented

- Added the initial Cloudflare D1 schema migration at `cloudflare/d1/migrations/0001_init.sql`.
- Replaced the Node filesystem fallback with an OpenNext-compatible D1 repository.
- Added canonical, cafe-scoped menu lookup and server-side order pricing. Client-supplied prices
  are ignored, invalid quantities and unavailable/cross-cafe items are rejected, and order rows
  are inserted atomically.
- Connected the database abstraction to OpenNext's Cloudflare context and added Worker build,
  preview, and deploy scripts.
- Protected the demo reset with an explicit development-only environment check and a secret
  request header. Administrative order listing, order updates, and menu mutations also fail
  closed outside development until staff authentication is available.
- Added automated D1 pricing and tenant-boundary checks (`pnpm test:d1`).

### Required Before Production

- Create a Cloudflare D1 database and replace the placeholder `database_id` in `wrangler.jsonc`.
- Apply the D1 migration and seed the intended data. The protected development reset repopulates
  the demo fixtures; it must not be enabled against production data.
- Implement Better Auth-backed staff sessions and enforce cafe membership/roles for every admin
  endpoint. These endpoints are deliberately unavailable outside development today.
- Replace order-ID-only tracking with dedicated customer capability tokens and define customer
  access to order details.
- Complete the Capacitor applications, R2 setup, and a deployment test on the target Cloudflare
  account.

For local OpenNext binding access, create an ignored `.dev.vars` file containing
`ENVIRONMENT=development` and a private `ADMIN_RESET_SECRET`. Never use those development values
on a remotely reachable Worker.