# Aruba Royalty Stamp - Architecture Documentation

## System Overview
Production-ready multi-tenant SaaS platform for digital loyalty stamp programs in Aruba.

## Technology Stack
- **Frontend**: Next.js 15.5 (Page Router), React 19, TypeScript
- **Styling**: Tailwind CSS 3.4, shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Deployment**: Vercel (production), Daytona.io sandbox (development)

## Database Architecture

### Core Multi-Tenancy Model
All data is strictly isolated by `business_id` using Row Level Security (RLS) policies.

**Business Hierarchy:**
```
businesses (tenant root)
├── business_users (staff)
├── loyalty_programs
│   ├── customer_loyalty_cards
│   ├── stamp_transactions (immutable audit log)
│   ├── rewards
│   └── qr_codes
├── subscription_payments
└── payment_transactions
```

**Customer Hierarchy:**
```
customers (user_id → auth.users)
├── customer_loyalty_cards (links to businesses)
├── stamp_transactions
├── rewards
└── payment_transactions
```

### Security Model

**Role-Based Access:**
1. **Super Admin** (`profiles.is_super_admin = true`)
   - Full platform access across all businesses
   - Manage subscription plans, approve payments, suspend accounts

2. **Business Owner** (`businesses.owner_id = auth.uid()`)
   - Full access to their business data only
   - Manage staff, loyalty programs, view analytics

3. **Business Staff** (`business_users.user_id = auth.uid()`)
   - Issue stamps, redeem rewards (via RPC functions)
   - View customer cards and program analytics

4. **Customer** (`customers.user_id = auth.uid()`)
   - View own loyalty cards, stamps, rewards
   - Generate personal QR codes for stamping

**RLS Enforcement:**
- All tables have RLS enabled
- Policies use `auth.uid()` for user identification
- Business isolation via `EXISTS` checks on `businesses.owner_id`
- Staff access via `business_users` table lookups
- Super Admin bypass via `profiles.is_super_admin` checks

**Anti-Manipulation:**
- Stamp issuance uses `issue_stamp()` SECURITY DEFINER RPC (server-side validation)
- Reward redemption uses `redeem_reward()` SECURITY DEFINER RPC (prevents double redemption)
- All critical transactions are immutable (INSERT only, no UPDATE/DELETE for customers)

### Performance Optimizations

**Indexes (25+ critical indexes):**
- Foreign keys: `business_id`, `customer_id`, `loyalty_program_id`
- Status fields: `status`, `active`, `subscription_plan`
- Lookup fields: `slug`, `reward_code`, `payment_reference`, `user_id`
- Temporal: `created_at DESC` for recent activity queries

**Query Patterns:**
- Dashboard analytics use COUNT with RLS filters (indexed)
- Stamp history uses `created_at DESC` index for recency
- Reward lookups use composite `customer_id + status` index
- Payment searches use `payment_reference` unique index

## Payment Architecture

### Current: Manual Bank Transfer
**Flow:**
1. Business initiates upgrade → selects plan
2. System displays bank details + unique `payment_reference`
3. Business uploads payment proof (Supabase Storage: `payment-proofs` bucket)
4. Super Admin reviews → approves/rejects
5. Approval triggers subscription activation + plan upgrade

**Tables:**
- `subscription_payments`: stores requests with proof URLs
- `platform_bank_accounts`: stores payment destination details

### Future Expansion: Sentoo Integration
**Design:**
- Payment abstraction layer via `payment_transactions` table
- `provider` field supports: `bank_transfer`, `sentoo`, `card`
- Webhook endpoint: `/api/payments/webhook`
- Server-side verification using `SUPABASE_SERVICE_ROLE_KEY`

**Required Environment Variables (future):**
```
SENTOO_API_KEY=xxx
SENTOO_MERCHANT_ID=xxx
SENTOO_WEBHOOK_SECRET=xxx
```

## Feature Expansion Readiness

### Already Supported (no schema changes needed):
- ✅ Multiple loyalty programs per business (plan limits enforced)
- ✅ Staff management via `business_users` table
- ✅ Custom branding (`businesses.primary_color`, `loyalty_programs.card_color`)
- ✅ Digital card customization (templates, icons)
- ✅ QR code generation for programs
- ✅ Customer QR codes for stamping
- ✅ Immutable transaction audit trail

### Future Features (schema extensions required):
1. **Notifications** (add `notifications` table)
   - WhatsApp, Email, SMS via external providers
   - Push notifications via service workers
   - Notification preferences per customer

2. **Advanced Rewards** (extend `rewards` table)
   - Birthday rewards: add `triggered_by` field
   - Referral rewards: add `referral_code`, `referred_by` columns
   - Multi-tier rewards: add `tier_level` field
   - Digital coupons: add `coupon_code`, `discount_type` columns

3. **Points-Based Loyalty** (add `points_transactions` table)
   - Alternative to stamp-based system
   - Cashback support via `points_value_awg` field

4. **Multi-Location** (add `business_locations` table)
   - Franchise management
   - Location-specific programs
   - Consolidated business analytics

5. **Advanced Analytics** (materialized views)
   - Customer segmentation (RFM analysis)
   - Program performance metrics
   - Revenue attribution

6. **Wallet Integration** (extend `customer_loyalty_cards`)
   - Apple Wallet pass generation
   - Google Wallet pass generation
   - NFC support via `nfc_id` field

7. **Cross-Business Loyalty** (add `loyalty_networks` table)
   - Aruba-wide loyalty marketplace
   - Shared customer base
   - Network-wide rewards

8. **Gift Cards** (add `gift_cards` table)
   - Balance tracking
   - Transfer support
   - Expiry management

## API Routes

### Current Implementation:
- `/api/hello` - Health check endpoint

### Future Endpoints:
- `/api/payments/webhook` - Sentoo webhook receiver
- `/api/notifications/send` - Trigger customer notifications
- `/api/analytics/export` - CSV export for business owners
- `/api/integrations/pos` - POS system integration
- `/api/wallet/generate` - Apple/Google Wallet pass generation

## Mobile-First Design

**Responsive Breakpoints:**
- Mobile: `< 640px` (base, mobile-first)
- Tablet: `sm: >= 640px`
- Desktop: `md: >= 768px`, `lg: >= 1024px`

**Mobile Optimizations:**
- Touch-friendly tap targets (min 44×44px)
- Hamburger navigation on mobile
- Sticky headers for context retention
- Bottom-aligned CTAs for thumb reach
- Card-based layouts for scanability
- QR code scanning via device camera (html5-qrcode)
- Payment proof upload via camera

**Key Mobile Screens:**
1. Customer loyalty card view (full-screen, scannable QR)
2. Stamp collection progress (visual, celebratory)
3. Staff scanner (camera + manual input)
4. Business dashboard (card grid, swipeable)

## Deployment

### Environment Variables
**Required (.env.local):**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx (server-side only)
```

**Production (Vercel):**
- Automatic deployments from `main` branch
- Environment variables set in Vercel dashboard
- Preview deployments for pull requests

### Database Migrations
- Managed via Supabase Dashboard or CLI
- Migration files: `supabase/migrations/*.sql`
- Version-controlled schema changes
- RLS policies included in migrations

## Testing Strategy

### Manual Testing Checklist:
1. **Business Onboarding**: Register → Onboard → Create Program
2. **Customer Journey**: Join → Collect Stamps → Earn Reward → Redeem
3. **Staff Operations**: Login → Scan QR → Issue Stamp → Verify Reward
4. **Admin Controls**: Approve Payment → Suspend Business → Edit Plan Limits
5. **Mobile Responsiveness**: iPhone SE → iPad → Desktop

### Security Testing:
- Attempt to access other business's data (should fail via RLS)
- Attempt to manipulate stamp count via frontend (should fail, RPC only)
- Attempt double reward redemption (should fail via `redeem_reward` RPC)
- Attempt to view Super Admin panel as regular user (should redirect)

## Scalability Considerations

**Current Limits (Starter Plan):**
- 1 loyalty program per business
- 300 customers per program
- Unlimited stamps/transactions

**Database Performance:**
- Indexes support up to ~1M transactions per program
- Supabase auto-scales with usage
- Connection pooling handles concurrent users

**Future Optimizations:**
- Materialized views for dashboard analytics
- Read replicas for reporting queries
- CDN for static assets (already via Vercel)
- Database partitioning for multi-year data

## Support & Maintenance

**Monitoring:**
- Supabase Dashboard: query performance, RLS errors
- Vercel Analytics: page load times, user flows
- Error tracking: Next.js error boundaries

**Backup Strategy:**
- Supabase automatic daily backups
- Point-in-time recovery available
- Manual export via Supabase CLI

**Update Process:**
1. Schema changes via migration files
2. Test in staging (preview deployment)
3. Deploy to production (auto via git push)
4. Monitor error logs post-deployment

---

**Last Updated:** Phase 8 Production Audit (2026-08-15)
**Version:** 1.0 - Launch Ready