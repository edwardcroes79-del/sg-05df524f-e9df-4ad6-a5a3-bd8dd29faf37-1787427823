---
title: Animate What's New Bell Icon
status: in_progress
priority: medium
type: feature
tags: [dashboard, ui, animation]
created_by: agent
created_at: 2026-09-26T23:25:00Z
position: 67
---

## Notes
Improve the "What's New" bell icon UX by adding a subtle animation when there are unread items.
The animation should be a gentle shake/pulse that repeats a few times with a pause in between, avoiding continuous distracting shaking.
It must only animate when unread items exist and stop when the panel is opened (items read).
Must respect `prefers-reduced-motion` accessibility settings (disable animation).
Do not change underlying content, DB logic, or layout.

## Checklist
- [ ] Open `DashboardLayout.tsx` and `globals.css`.
- [ ] Add custom CSS keyframes for a gentle bell shake with a built-in pause (`bell-shake-pause`).
- [ ] Ensure `prefers-reduced-motion` disables the animation.
- [ ] Apply the animation class to the Bell icon conditionally (`!hasReadWhatsNew`).
- [ ] Verify animation stops when opened.
- [ ] Check responsive and layout stability.
- [ ] Run project validation.

## Acceptance
Unread What's New item causes the icon to animate subtly.
No unread items means no animation.
Animation pauses briefly between shakes.
Opening the What's New panel stops the animation.
`prefers-reduced-motion` correctly disables it.