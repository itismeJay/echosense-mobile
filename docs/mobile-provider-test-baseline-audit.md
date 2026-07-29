# Mobile provider-test notification baseline audit

Audit date: 2026-07-30

Scope: `/Users/jay/echosense-mobile` only. No backend, frontend, or edge
repository was modified or queried.

The previous mobile phase was committed and pushed at `f1c0bef`. The only
pre-existing working-tree change was the tracked, machine-specific
`.claude/settings.local.json`; it was preserved and excluded from this phase.

| Requirement | Current behavior | Relevant files | Missing work | Risk |
| --- | --- | --- | --- | --- |
| Provider-test contract | Only a classroom-alert-shaped payload with a positive `alertId` was accepted | `lib/notificationPayload.ts` | Add an independent strict `provider_test` variant | Safe provider tests were suppressed |
| Exact provider copy | Only LOW, MEDIUM, and HIGH classroom templates were accepted | `lib/notificationPayload.ts`, `app/_layout.tsx` | Add the one approved test title/body pair | Alternate or misleading copy could be displayed |
| Provider-test route | No `/notifications/test` route existed | `app/` | Add an authenticated, non-alert screen | A tap had no safe destination |
| Pending navigation | Only a pending alert ID was stored | `lib/notifications.ts`, `lib/notificationNavigation.ts` | Persist a typed minimal intent | Test intent could be lost or treated as alert data |
| Deduplication | Alert ID was the only identity | `lib/notificationDedup.ts`, `lib/notifications.ts` | Use namespaced `test_id` identity | Duplicate handling or ID collisions |
| Android behavior | Normal and HIGH channels existed | `lib/notificationChannels.ts`, `app.json` | Explicitly select the normal channel for provider tests | A harmless test could appear high priority |
| iOS behavior | Ordinary notification handling existed | `app/_layout.tsx` | Admit validated provider tests without Critical Alerts behavior | Test receipt could remain suppressed |

No notification, classroom alert, microphone input, detection request, or
production API request was generated during this audit.
