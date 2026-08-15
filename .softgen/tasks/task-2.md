---
title: Phase 2 - Landing Page & Business Onboarding
status: done
priority: urgent
type: feature
tags: [landing, auth, onboarding, businesses]
created_by: agent
---

## Notes
- Build Aruba-focused landing page (Hero, How It Works, Features, Benefits, Pricing, FAQ, CTA, Footer).
- Build Supabase Auth flows (Login, Register).
- Build Multi-step Business Onboarding (Profile, Brand Colors, First Loyalty Program).
- Must use real database inserts, RLS, and strict error handling.

## Checklist
- [x] Create Landing Page (`src/pages/index.tsx`).
- [x] Create Auth pages (`src/pages/auth/login.tsx`, `src/pages/auth/register.tsx`).
- [x] Create Onboarding flow (`src/pages/onboarding.tsx`).
- [x] Connect Onboarding to `businesses` and `loyalty_programs` tables.
- [x] Ensure all routing and validations work.

## Acceptance
- Landing page visually aligns with Caribbean Utility and Aruba context.
- Registration creates a Supabase Auth user.
- Onboarding successfully creates a business and a loyalty program row in the database, redirecting to a dashboard.