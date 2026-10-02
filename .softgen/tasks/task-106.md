---
title: Add Stamp Correction to What's New
status: done
priority: medium
type: feature
tags: [whats-new, i18n, announcements]
created_by: agent
created_at: 2026-10-02T11:45:21Z
position: 106
---

## Notes
Add a new item to the existing Business Dashboard 🔔 What's New section.
Title: ↩️ Stamp Correction
Status: COMING SOON
Description: Soon, Business Admins will be able to correct stamps issued by mistake or issued twice. Keep customer loyalty balances accurate with a secure correction process and a clear audit history.
Used existing i18n system for translations (English, Spanish, Aruban Papiamento). Used "Papiamento". Preserved existing What's New functionality. Did not implement the stamp correction functionality yet.

## Checklist
- [x] Add translation keys for Stamp Correction in English, Spanish, and Papiamento
- [x] Add Stamp Correction announcement to `DashboardLayout.tsx`
- [x] Ensure it uses the "COMING SOON" badge
- [x] Test the integration and run project validation

## Acceptance
The Stamp Correction announcement appears in the What's New modal as COMING SOON.
Translations are correct across English, Spanish, and Papiamento.