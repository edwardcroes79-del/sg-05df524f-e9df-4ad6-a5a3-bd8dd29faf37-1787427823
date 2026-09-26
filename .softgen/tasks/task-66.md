---
title: Move Logout and What's New to Top Right
status: done
priority: medium
type: chore
tags: [dashboard, ui, navigation]
created_by: agent
created_at: 2026-09-26T23:15:00Z
position: 66
---

## Notes
Move the "What's New" and "Logout" buttons from their current lower position in the Business Dashboard to the top-right header area. Ensure both buttons are visible without scrolling on desktop and tablet, and implement a compact/responsive layout for mobile. Remove the old duplicate locations. Do not modify authentication logic, logout destination, What's New data, or any backend functionality.

## Checklist
- [x] Open `DashboardLayout.tsx` to inspect header and sidebar/navigation structure.
- [x] Move "What's New" and "Logout" controls to the top-right header.
- [x] Ensure mobile responsiveness without introducing horizontal scrolling.
- [x] Remove the old buttons from their previous location.
- [x] Verify existing notification badges and logout behavior remain fully functional.
- [x] Run project validation.

## Acceptance
Business Admin can see What's New and Logout in the top-right header immediately.
No horizontal scrolling on mobile devices.
The old duplicate buttons are removed.
Existing functionality (badges, logout logic) works perfectly.