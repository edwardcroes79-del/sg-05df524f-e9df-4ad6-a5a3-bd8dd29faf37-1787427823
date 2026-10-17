---
title: Add Floating WhatsApp Support Button
status: done
priority: medium
type: feat
...
## Checklist
- [x] Create `WhatsAppSupportButton` component with exact URL (`https://wa.me/5678222`).
- [x] Add WhatsApp green styling, subtle shadow, tooltips, and "Need help?" text.
- [x] Insert the component in `DashboardLayout.tsx`.
- [x] Verify button works on dashboard and checks pass.

## Acceptance
The floating WhatsApp button appears on the authenticated business dashboard using WhatsApp styling, and opens the link in a new tab, respecting mobile and desktop constraints. It does not appear on public pages or the super admin panel.