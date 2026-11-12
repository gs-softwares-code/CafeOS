# CafeOS Architecture Validation

> The sections below document the original architecture assessment. The implementation status
> and the security boundaries currently enforced are recorded in section 4.

## 1. Current Architecture

### Database Layer
- **File-based storage**: Uses `.data/cafeos_store.json` for persistence
- **Supabase**: Has `getSupabaseAdmin()` function but not used in application layer
- **RLS policies**: Exist in SQL schema but not enforced in application
- **Tenant isolation**: Enforced via `cafe_id` in all operations

### API Layer
- **Order creation**: Validates `cafe_id`, checks item availability, calculates prices server-side ✅
- **Order retrieval**: Requires `cafe_id` parameter for GET requests ✅
- **Menu management**: Validates `cafe_id` for all operations ✅
- **Demo reset**: No authentication required ❌ (security vulnerability)

### Security Issues
1. **Demo reset endpoint** (`/api/demo/reset`) has no authentication - anyone can reset demo data
2. **Order retrieval**: While it requires `cafe_id`, there's no verification that the user is authorized to access that café
3. **Menu management**: Same issue - requires `cafe_id` but no user authorization

### Next.js/Cloudflare Compatibility
- **Next.js 15** with App Router - compatible with Cloudflare Workers
- **OpenNext** is the correct adapter for this project
- **File-based storage** needs to be replaced with D1
- **Supabase**: Currently unused in the app layer (only in seed data)

## 2. Verified Problems

### Database Layer
- **File-based persistence**: Not suitable for production Cloudflare deployment
- **Supabase unused**: The `getSupabaseAdmin()` function exists but is never called in the application
- **RLS policies**: Exist in SQL schema but are not enforced in the application layer

### API Layer
- **Unauthenticated demo reset**: Anyone can reset demo data via `/api/demo/reset`
- **Authorization gaps**: All endpoints require `cafe_id` but don't verify user ownership of that café
- **No authentication**: No login/logout mechanism for staff or customers

### Cloudflare Migration
- **Current architecture**: File-based storage + unused Supabase
- **Target architecture**: D1 database + Cloudflare Workers + R2 storage
- **Migration path**: Must migrate from file-based to D1 while maintaining API compatibility

## 3. Cloudflare Target Architecture

### Components
1. **Compute**: Cloudflare Workers (Next.js via OpenNext adapter)
2. **Database**: Cloudflare D1 (authoritative source of truth)
3. **Storage**: Cloudflare R2 (for images and files)
4. **Authentication**: Better Auth with D1
5. **API**: REST endpoints with proper authentication and authorization

### Key Changes Required
1. Replace file-based storage with D1
2. Implement proper authentication for admin operations
3. Enforce user-cafe ownership for all operations
4. Protect destructive endpoints
5. Implement Better Auth for staff and customer authentication
6. Configure OpenNext for Cloudflare deployment

## 3. Next Steps
1. Create D1 schema matching current file-based schema
3. Implement authentication layer with Better Auth
3. Modify database layer to use D1 instead of file storage
4. Protect demo reset endpoint
4. Verify Next.js compatibility with Cloudflare Workers

## 4. Stage 1 Implementation Update

- The local filesystem database fallback has been removed. Cloudflare requests use the D1 binding;
  seed fixtures remain as read-only fallback data when no database binding is present.
- `cloudflare/d1/migrations/0001_init.sql` defines the app-compatible D1 schema.
- `src/lib/db/d1.ts` validates active cafes and cafe-scoped menu items, recalculates order totals
  from database prices (stored as integer paise), and writes each order and its line items in one
  D1 batch.
- The demo reset now requires `ENVIRONMENT=development` and the `ADMIN_RESET_SECRET` header.
  The reset button prompts for that secret; do not set a development environment on a public Worker.
- Order listing, order status changes, and menu mutations are disabled outside the explicit
  development environment until staff authentication and membership checks are implemented.
  Single-order tracking uses the randomly generated order ID as a capability and omits the
  customer's phone number from its response.
- Production staff authentication, customer order capability tokens, authorization-aware menu
  access, and deployment data migration remain unimplemented. Do not treat the current demo
  dashboard as a production admin surface.
- The project now uses `@opennextjs/cloudflare`. Replace the all-zero D1 ID in `wrangler.jsonc`
  with the real database ID before remote deployment. Local secrets belong in the ignored
  `.dev.vars` file.

Verification commands:

```sh
pnpm test:d1
pnpm exec wrangler d1 migrations apply cafeos --local
pnpm build
pnpm cf:build
```