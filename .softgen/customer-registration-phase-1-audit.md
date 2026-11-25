# Royalty Stamp – Phase 1 Customer Registration Audit and Implementation Plan

Created: 2026-11-25

## Scope
Inspection only. No application code, database schema, authentication settings, RLS policies, or production configuration were changed in this phase.

## Confirmed findings

### 1. Current registration workflow
Primary customer auth surface:
- `src/pages/auth/customer.tsx`

Observed current customer journey:
1. A customer reaches `/join/[id]` for a loyalty program QR flow (`src/pages/join/[id].tsx`).
2. If not authenticated, pressing the CTA redirects to `/auth/customer?returnUrl=<current join path>` (`src/pages/join/[id].tsx`).
3. On the customer auth page, the sign-up form collects:
   - Full name
   - Email
   - Password
   - Cloudflare Turnstile token
   (`src/pages/auth/customer.tsx`)
4. Sign-up submits to `/api/auth/register-customer` with:
   - `email`
   - `password`
   - `name`
   - `turnstileToken`
   - `returnUrl`
   - `origin`
   (`src/pages/auth/customer.tsx`, `src/pages/api/auth/register-customer.ts`)
5. The API creates a Supabase Auth user by calling `supabaseAdmin.auth.admin.generateLink({ type: "signup" ... })`, not client-side `signUp` (`src/pages/api/auth/register-customer.ts`).
6. The API upserts a `customers` row keyed by `user_id` immediately after auth user creation (`src/pages/api/auth/register-customer.ts`).
7. The API sends a custom SMTP verification email containing the Supabase-generated action link (`src/pages/api/auth/register-customer.ts`).
8. The UI does not auto-login the user after registration. It locks the form into a success state and tells the user to verify email (`src/pages/auth/customer.tsx`).
9. After email confirmation, the redirect target is `/auth/customer?confirmed=true&returnUrl=...` (`src/pages/api/auth/register-customer.ts`).
10. There is no confirmed handling in `src/pages/auth/customer.tsx` for `confirmed=true`; the file reads `returnUrl` but does not process a `confirmed` query parameter.

Current simplification blockers:
- Verification email step interrupts the desired QR → register → automatic login flow.
- Registration requires password creation before the customer can enter the wallet.
- Post-confirmation behavior appears to rely on the user manually signing in after email verification.

### 2. Current registration validation and error handling
Client-side validation in `src/pages/auth/customer.tsx`:
- Name required
- Turnstile token required
- Password min length 6
- Loading and duplicate-submit guard via `isSubmitting`
- Error toasts for failed registration

Server-side validation in `src/pages/api/auth/register-customer.ts`:
- POST only
- Requires email, password, and name
- Normalizes email to lowercase and trims name
- Requires valid Turnstile verification
- Requires Supabase service role environment configuration
- Rolls back the created auth user if `customers` synchronization fails
- Returns the direct provider/admin error message for Supabase link-generation failures

Notable behavior:
- On successful registration, the UI intentionally stays locked and does not restore the form.
- On failure, Turnstile is reset and the user can retry.

### 3. How customer profiles and memberships are stored
Confirmed from application code:
- Customer identity record is stored in `public.customers` with `user_id`, `name`, and `email` (`src/pages/api/auth/register-customer.ts`, `src/pages/customer/index.tsx`).
- Loyalty membership/card records are stored in `public.customer_loyalty_cards` (`src/pages/join/[id].tsx`, `src/pages/customer/index.tsx`).
- The join flow creates membership/cards only when the authenticated customer presses the join CTA on the QR landing page (`src/pages/join/[id].tsx`).

Important current separation:
- Registration creates the auth user and `customers` row.
- Registration does not create the loyalty card membership.
- Membership is created later, in the `/join/[id]` page, after authentication.

### 4. How existing customers are identified
Current logic uses several checks:
- Customer sign-in uses `supabase.auth.signInWithPassword` (`src/pages/auth/customer.tsx`).
- After sign-in, the app checks:
  1. `profiles.role` and `profiles.is_super_admin`
  2. `customers.user_id`
  3. `business_users.user_id`
  (`src/pages/auth/customer.tsx`)

Routing rules currently observed:
- If a `customers` row exists, route to `returnUrl` or `/customer`
- If `profiles.role === "customer"`, route to `returnUrl` or `/customer`
- If super admin, route to `/admin`
- If `business_users` membership exists, route to `/dashboard`
- Fallback goes to `returnUrl` or `/customer`

This means the login page is shared enough to route different account types safely after authentication, but the dedicated customer page still performs role resolution.

### 5. How duplicate customer accounts and memberships are prevented
Confirmed:
- `customers` row creation uses `upsert(... onConflict: "user_id", ignoreDuplicates: true)` (`src/pages/api/auth/register-customer.ts`), which prevents duplicate `customers` rows for the same auth user.
- `/join/[id]` checks for an existing `customer_loyalty_cards` row by `customer_id + loyalty_program_id` before inserting a new one (`src/pages/join/[id].tsx`).

Likely but not fully confirmed from visible code alone:
- Duplicate auth accounts by email are prevented by Supabase Auth email uniqueness.
- Duplicate memberships are likely also reinforced by a database unique constraint on `customer_loyalty_cards`, but this phase confirms only the app-side existence check from the opened files.

### 6. Current authentication and email verification behavior
Confirmed:
- Registration is email-verification based today because the API generates a Supabase signup confirmation link and emails it manually (`src/pages/api/auth/register-customer.ts`).
- Automatic login after registration is not currently implemented (`src/pages/auth/customer.tsx`).
- Customer sessions are currently created on explicit sign-in with `supabase.auth.signInWithPassword` (`src/pages/auth/customer.tsx`).
- Password recovery uses a separate API route that generates a Supabase recovery link and sends it through SMTP (`src/pages/api/auth/request-password-recovery.ts`).
- Password reset completion uses `supabase.auth.updateUser({ password })` and then signs the user out before routing them back to the correct login screen (`src/pages/auth/update-password.tsx`).

Confirmed cross-account implications:
- Password recovery is shared infrastructure, not customer-only.
- Post-reset routing distinguishes customer vs business/admin users by reading `profiles`, `customers`, and `business_users` (`src/pages/auth/update-password.tsx`).
- Business owners, staff, and super admins therefore share the same Supabase Auth system and are not isolated into a separate auth provider.

### 7. Supabase configuration limitations
Confirmed from code:
- Registration is currently implemented with Supabase Auth admin link generation plus custom email delivery.
- The app does not show any customer-only email confirmation toggle. The behavior appears to rely on the project-wide Supabase signup confirmation mechanism exposed through generated links.
- The password recovery flow uses a single canonical redirect allowlist and shared Supabase Auth recovery link generation (`src/pages/api/auth/request-password-recovery.ts`).

Confirmed limitation:
- There is no evidence in the inspected code of separate native Supabase email-confirmation rules by user type. Any change to confirmation behavior must be treated as potentially global until explicitly confirmed in Supabase settings.

Assumption requiring explicit verification in Phase 2 before any implementation:
- Whether the current Supabase project has global “Confirm email” enabled for all signup flows, or whether this flow effectively enforces verification because the API always sends and expects the generated signup link.

### 8. QR code and loyalty program connection process
Confirmed:
- The active join route is `src/pages/join/[id].tsx`, where `[id]` is the loyalty program ID.
- If the user is unauthenticated, the route redirects to `/auth/customer?returnUrl=<router.asPath>` (`src/pages/join/[id].tsx`).
- The customer auth page parses `returnUrl` to fetch context for:
  - `/join/[slug]/[program_id]`
  - `/quick-stamp/[token]`
  (`src/pages/auth/customer.tsx`)
- However, the active join route visible in this phase is `/join/[id]`, not `/join/[slug]/[program_id]`.
- After authentication, sign-in returns the user to `returnUrl` if present (`src/pages/auth/customer.tsx`).
- The actual loyalty membership/card is created only when `handleJoin` runs on the join page (`src/pages/join/[id].tsx`).
- After joining, the app routes the user to `/customer`, not directly to a specific loyalty card (`src/pages/join/[id].tsx`).

Confirmed risk:
- There is a mismatch between the auth page’s business-context parsing and the active QR join route:
  - Auth context fetch expects `/join/[slug]/[program_id]`
  - Current join page uses `/join/[id]`
- This can cause lost or incomplete business/program branding context during registration.
- The current flow does preserve `returnUrl`, but it does not guarantee a direct open of the correct loyalty card after registration; it returns to the join page first, and after join it goes to `/customer`.

### 9. Existing customer handling for additional businesses/programs
Confirmed:
- Existing signed-in customers can use `/join/[id]` to add another program.
- The join page checks whether the relevant `customer_loyalty_cards` row already exists before inserting.
- If the card already exists, it skips insertion and still routes to `/customer`.

Current limitation:
- The join flow always routes to `/customer`, not to the newly joined or already-existing specific card.

### 10. Protected stamping system and safe change boundaries
Protected systems identified by dependency:
- Customer QR identity display on `/customer` (`src/pages/customer/index.tsx`)
- Card/membership storage in `customer_loyalty_cards`
- Realtime updates for customer card progress and rewards on the customer dashboard (`src/pages/customer/index.tsx`)
- Existing stamp/reward records and their dependent reads

Confirmed safe change boundary candidates:
- `src/pages/auth/customer.tsx`
- `src/pages/api/auth/register-customer.ts`
- `src/pages/join/[id].tsx`
- Potentially the customer post-auth/post-join routing behavior in customer wallet entry surfaces

These appear changeable without altering stamp transaction logic itself, as long as:
- `customers` rows continue to map correctly to `auth.users`
- `customer_loyalty_cards` creation semantics remain intact
- Existing QR payload formats for stamping are not changed
- Realtime subscriptions on customer pages are left intact

## Confirmed existing business/admin authentication behavior
From inspected files:
- Staff, owners/admins, and super admins share the same Supabase Auth user system.
- The customer auth page already contains role-aware routing to `/admin`, `/dashboard`, or `/customer` after sign-in (`src/pages/auth/customer.tsx`).
- Password reset completion also distinguishes customer vs business/admin accounts using `profiles`, `customers`, and `business_users` (`src/pages/auth/update-password.tsx`).

## Assumptions and evidence gaps
These are not confirmed in this phase from opened files alone:
1. Exact Supabase dashboard auth setting for global email confirmation.
2. Exact unique constraints and RLS policies on `customer_loyalty_cards` and `customers` beyond what app code implies.
3. Whether `/join/[id]/[program_id]` is legacy, partially used, or fully active elsewhere.
4. Whether any hidden session-exchange handler processes `confirmed=true` outside the opened files.
5. Whether specific wallet/card pages already support opening one exact loyalty card by query param or route.

## Files and components likely requiring changes in later phases
Primary candidates:
- `src/pages/auth/customer.tsx`
- `src/pages/api/auth/register-customer.ts`
- `src/pages/join/[id].tsx`

Possible supporting surfaces:
- `src/pages/customer/index.tsx`
- `src/pages/customer/cards.tsx`
- Any route or component that can deep-link to a specific loyalty card after join
- Potentially shared auth-security redirect helpers if return-path normalization needs to preserve more context

## Database changes that might be necessary
Preferred path:
- Reuse existing `customers` and `customer_loyalty_cards` tables.

Potential database changes are not yet proven necessary.

Only if current constraints are insufficient in Phase 2 validation:
- Add or verify a unique constraint that enforces one membership per `customer_id + loyalty_program_id`
- Add a lightweight persisted “last joined program” or redirect helper only if existing routing cannot safely open the correct card without it

At this phase, no table recreation or schema redesign appears justified.

## Risks and dependencies
1. Global auth setting risk
- If email confirmation is disabled globally to simplify customer onboarding, it may also affect owner, staff, or super admin accounts unless their flows are separated some other way.

2. QR context mismatch risk
- The auth page expects `/join/[slug]/[program_id]` branding context, but the active visible join route is `/join/[id]`.
- Simplification work must preserve QR context consistently across sign-up, confirmation/sign-in, and program join.

3. Membership timing risk
- Today, registration and program joining are separate steps.
- Combining them into one automatic flow must avoid duplicate membership creation and must preserve existing card/reward/stamp relationships.

4. Routing risk
- Current post-join routing goes to `/customer`, not the exact joined card.
- Changing this should not break generic customer dashboard behavior or existing wallet navigation.

5. Shared auth dependency
- Password recovery and account routing are shared across account types.
- Any auth simplification must avoid changing business/admin behavior.

## Recommended implementation order

### Phase 2
1. Confirm the actual global Supabase email confirmation setting in the Supabase dashboard before changing any flow.
2. Decide whether customer simplification can be achieved without changing global confirmation behavior.
3. Normalize QR context handling so the registration page reliably understands the active join route.
4. Design the desired post-registration return path:
   - auto-login directly to join flow, or
   - return to join page and auto-complete membership creation, or
   - route directly to the exact loyalty card after safe membership creation
5. Verify database uniqueness guarantees for customer memberships before automating join creation.

### Phase 3
1. Implement the chosen simplified customer registration flow.
2. Preserve shared auth behavior for staff, owners/admins, and super admins.
3. Add precise post-auth redirect behavior that opens the correct program/card.
4. Validate that existing customers can still join additional programs without duplicate memberships.
5. Regression test the entire stamping system without altering stamp issuance logic.

## Safe test strategy without affecting the stamping system
Use isolated manual tests focused on registration and join only:

1. New customer from QR
- Open `/join/[id]`
- Register
- Confirm whether session creation is immediate or deferred
- Confirm whether the correct program is joined and the correct wallet/card opens

2. Existing customer from QR
- Sign in from `/auth/customer?returnUrl=...`
- Ensure return to the originating join page
- Ensure no duplicate card is created

3. Additional-program join
- Existing logged-in customer joins a second business/program
- Confirm a second card is created only once

4. Business/admin regression
- Test `/auth/login`
- Test password recovery for a business/admin user
- Confirm dashboard/admin routing is unchanged

5. Stamping regression read-only verification
- Confirm existing customer QR still renders on `/customer`
- Confirm existing card counts/rewards still load
- Confirm realtime updates still appear on the customer dashboard after normal stamp issuance by existing tools

## Concise summary
Current state:
- Registration is email-verification-first, not auto-login.
- Registration creates auth + customer identity, but not loyalty membership.
- Membership is created later in the join page.
- QR return context is preserved in principle via `returnUrl`, but branding/program parsing is inconsistent with the active join route.
- Shared Supabase Auth behavior means any email-confirmation change may affect non-customer account types unless handled carefully.

Recommendation:
- Do not start by changing global Supabase confirmation settings.
- First normalize QR context and post-auth routing, verify membership uniqueness guarantees, and design a customer-only simplification path that preserves shared auth safety.