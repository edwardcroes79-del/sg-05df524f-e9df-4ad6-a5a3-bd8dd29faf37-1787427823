---
title: Corporate Branding Application
status: done
priority: urgent
type: feature
tags: [corporate, branding, dashboard, customer-experience]
created_by: agent
created_at: 2026-10-08T14:08:56Z
position: 153
---

## Notes
Apply saved Corporate Branding from Phases 1–2 across the approved Corporate experience only. Use the existing backend/settings for logo, primary color, and secondary/accent color. Do not redesign the application or merge Corporate Branding with lower-plan Custom Card Branding. Preserve Royalty Stamp defaults when no custom branding exists. Keep business_id isolation, RLS, and server-side Corporate entitlement enforcement. Lower plans must remain visually and functionally unchanged unless they already use their separate existing branding features. Do not change pricing, billing, plan limits, Quick QR, locations, Advanced Analytics, staff permissions, loyalty calculations, authentication, or customer data.

## Checklist
- [x] Audit dashboard, navigation, loyalty card, and customer-facing Corporate loyalty surfaces that already receive business context
- [x] Add a reusable Corporate Branding client helper that loads saved branding through the Phase 1 backend and falls back to Royalty Stamp defaults
- [x] Apply Corporate logo/colors to the Corporate Business Dashboard header, navigation accents, and dashboard actions without changing lower-plan visuals
- [x] Apply Corporate branding to loyalty program cards and supported customer loyalty card/customer-facing Corporate loyalty surfaces
- [x] Ensure all new user-facing fallback/error text uses existing i18n in English, Spanish, and Papiamento
- [x] Verify Corporate default branding, custom branding persistence, lower-plan unchanged behavior, and project checks

## Acceptance
Corporate businesses with saved branding see their logo, primary color, and accent color across approved dashboard and loyalty/customer surfaces.
Corporate businesses without saved branding see safe Royalty Stamp defaults.
Non-Corporate businesses remain unchanged and cannot access another business branding.