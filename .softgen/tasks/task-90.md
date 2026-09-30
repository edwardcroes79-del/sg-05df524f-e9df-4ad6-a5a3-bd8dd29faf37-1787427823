---
title: Spanish i18n foundation
status: done
priority: high
type: feature
tags: [i18n, spanish, accessibility, foundation]
created_by: agent
created_at: 2026-09-30T16:20:00Z
position: 90
---

## Notes
Added proper internationalization foundation for English and Spanish. English remains default. Spanish support uses a centralized typed translation dictionary, i18n provider/hook, accessible language selector, and persisted user language selection. Business-created content such as customer names, business names, program names, descriptions, and reward titles remains untranslated. Preserved existing database data, authentication, RLS, permissions, billing, plans, add-ons, QR, stamp, reward, and dashboard functionality. Existing isolated business-created and feature-specific content remains unchanged unless part of the shared shell touched by this foundation. Project validation passed with no CSS, lint, TypeScript, or server errors.

Changed files:
- `src/lib/i18n.ts`: centralized English and Spanish translation dictionaries with typed keys.
- `src/contexts/I18nProvider.tsx`: shared provider/hook with persisted language state.
- `src/components/LanguageSelector.tsx`: accessible shared language selector.
- `src/pages/_app.tsx`: wraps the app with the i18n provider.
- `src/components/customer/CustomerLayout.tsx`: adds selector and translated customer shell navigation.
- `src/components/dashboard/DashboardLayout.tsx`: adds selector and translated dashboard shell navigation/status text.
- `src/pages/auth/login.tsx`: adds selector and translated login/MFA shell text.

## Checklist
- [x] Inspect existing codebase for any i18n, locale, language, or translation architecture
- [x] Create or reuse centralized English and Spanish translation dictionaries with typed keys
- [x] Add an i18n provider/hook that defaults to English and persists selected language
- [x] Add an accessible language selector to shared user-facing layout areas
- [x] Convert foundation/shared UI shell text touched by this change to translation keys
- [x] Ensure business-created/customer-created content remains untranslated
- [x] Run project validation

## Acceptance
Users can switch between English and Spanish from an accessible selector and the choice persists.
The app has a centralized typed translation-key foundation ready for future UI conversion.
No database data, auth, RLS, permissions, billing, plans, add-ons, QR, stamp, or reward logic is changed.