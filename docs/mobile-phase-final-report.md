# Mobile severity and notification implementation report

Date: 2026-07-30
Stage result: **IMPLEMENTED AND VERIFIED**

This result covers mobile implementation, automated checks, static
safety/privacy checks, Expo exports, and physical-device readiness
documentation. It does not claim that remote push delivery was tested on a
physical device.

## Baseline behavior

The detailed baseline is in
`docs/mobile-phase-baseline-audit.md`. In summary:

- invalid severity silently rendered as LOW
- alert API responses were TypeScript-cast without runtime parsing
- severity evidence and backend review notice were absent from detail UI
- historical null evidence had no explicit state
- notification listener/dedup/token foundations existed
- a pending notification target was cleared while unauthenticated, preventing
  post-login resume
- Android channels existed under generic IDs without review-focused
  descriptions
- 44 tests, TypeScript, lint, and public Expo config passed before edits

## Final behavior

- LOW, MEDIUM, HIGH, lowercase compatibility, and an explicit invalid state
- runtime-parsed alert contract with exact transcript preservation
- full plain-language severity-evidence section
- distinct null, omitted, valid-empty, and malformed evidence handling
- backend review notice with exact fallback
- severity-specific list titles and notification templates
- notification data privacy checks and stable alert-ID routing
- one listener pair with cleanup and process-local deduplication
- authenticated foreground/background/cold-start tap routing with post-login
  resume
- authenticated push registration with safe permission, duplicate, failure,
  rotation-on-next-start, race, and logout handling
- stable normal and high Android channels
- standard iOS notifications without Critical Alerts assumptions
- safe 401/403/404/network/invalid-response presentation
- truthful offline synchronization and physical-device limitations

## Files added

- `docs/mobile-phase-baseline-audit.md`
- `docs/mobile-phase-final-report.md`
- `lib/alertContract.ts`
- `lib/notificationChannels.ts`
- `lib/notificationNavigation.ts`
- `lib/notificationPayload.ts`
- `tests/alertContract.test.mjs`
- `tests/notificationChannels.test.mjs`
- `tests/notificationNavigation.test.mjs`
- `tests/notificationPayload.test.mjs`

## Files modified by this phase

- `app.json`
- `app/_layout.tsx`
- `app/alert/[id].tsx`
- `app/alerts.tsx`
- `app/history.tsx`
- `app/login.tsx`
- `app/profile.tsx`
- `components/AlertCard.tsx`
- `docs/mobile-alert-readiness.md`
- `lib/alertEvidence.ts`
- `lib/api.ts`
- `lib/constants.ts`
- `lib/notifications.ts`
- `lib/presentation.ts`
- `lib/types.ts`
- `tests/alertEvidence.test.mjs`
- `tests/presentation.test.mjs`
- `tests/source-safety.test.mjs`

Several of these files already contained uncommitted user work before this
phase. That work was preserved. Pre-existing unrelated changes in package,
TypeScript, auth, npm, and local settings files were not reset or discarded.

## Mobile contract and UI

The supported alert contract and UI behavior are documented in
`docs/mobile-alert-readiness.md`.

Frontend-consistent evidence mappings:

- `term_category:self_harm_directive` →
  “Severe self-harm directive detected in the transcript”
- `self_harm_directive` → “Severe self-harm directive”
- `laughter_or_excitement_marker_present` →
  “Laughter or excitement was present, but it did not cancel the stronger
  text evidence”

Unknown future keys receive neutral machine-key humanization. No stronger
meaning is invented.

Historical null evidence displays:

“Detailed severity evidence was not recorded for this historical alert.”

## Notifications, navigation, and tokens

LOW and MEDIUM use normal/default notification behavior. HIGH may use provider
high priority and `echosense-high-alerts`; it receives only a single standard
alert sound and no loop or emergency behavior.

Validated `alertId`/legacy `alert_id` is the navigation identity. Valid
`event_id` is retained only as supporting identity. Transcript, monitored-term,
raw-audio, student, or speaker fields cause foreground/tap payload handling to
be rejected.

The pending alert ID waits for authentication and router readiness. Detail
content is fetched only with the current bearer token. Sign-out clears pending
navigation and local deduplication state after safe token detachment.

The backend exposes one push-token string per user. Multi-device delivery is
not supported or claimed.

## Android and iOS

Android:

- `echosense-alerts`: default importance, LOW/MEDIUM, silent
- `echosense-high-alerts`: high importance, HIGH, one default sound
- installed channel settings may remain controlled by Android/the user
- provider payload must explicitly select the HIGH channel

iOS:

- standard permission and foreground presentation
- authenticated response routing
- no Critical Alerts entitlement or behavior
- lock-screen previews remain partly user-controlled

## Authentication and privacy

- protected routes keep bearer authentication
- stale 401 responses cannot clear a newer session
- 401 invalidates the applicable session; 403 and 404 are safe UI states
- no token, full alert, response body, or notification payload is logged
- no alert data is embedded in notification routes
- no raw-audio support, auth bypass, recipient expansion, or local production
  alert creation was added

## Verification results

| Check | Result |
| --- | --- |
| Automated Node tests | 67 passed, 0 failed |
| TypeScript | Passed |
| Expo lint | Passed |
| Expo public config | Passed |
| Expo Doctor | 18/18 passed |
| Expo dependency check | Dependencies up to date; local SDK map used because the first check was offline |
| Android export | Passed |
| iOS export | Passed |
| Web export | Passed |
| Export secret scan | No private key, JWT, Expo token, password assignment, or API-key pattern found |
| Static prohibited UI wording scan | No prohibited wording found in `app/`, `components/`, or `lib/` |
| Git whitespace check | Passed |
| Production inspection | GET-only OpenAPI; no protected alert list/detail requested |
| Production alert/push | Not created or sent |

The Node runner reports a non-failing module-type performance warning because
the project is not declared as an ESM package.

## Physical-device verification status

**READY FOR A CONTROLLED TEST, NOT PERFORMED.**

Apple tooling detected only the development Mac and iOS simulators. No
physical iPhone/iPad was connected. Android `adb` tooling/device output was
unavailable. Approved credentials, a controlled recipient, and explicit
approval to send a provider test were not supplied. Therefore token
registration, foreground/background receipt, and cold-start taps were not
claimed as physically verified.

The complete gate and procedure are in
`docs/mobile-alert-readiness.md`. No real alert or push notification was sent.

## Known limitations

- provider delivery and immediate delivery cannot be guaranteed
- deduplication is process-local, not provider exactly-once delivery
- one backend push token per user can cause another device to replace it
- logout uses blank-token detachment because no unregister endpoint exists
- background notification privacy and Android HIGH-channel selection depend
  on the backend/provider payload
- background presentation cannot be disabled by foreground-only mobile
  LOW/MEDIUM preferences
- simulators and Expo Go do not verify remote push
- no physical-device receipt test occurred

## Rollback instructions

Do not use a broad reset: the working tree contained user changes before this
phase.

1. Save the current diff as a review artifact.
2. Remove only the files listed under “Files added.”
3. Reverse only the mobile-phase hunks in “Files modified by this phase,”
   using editor/local-history or a reviewed reverse patch.
4. Retain the pre-existing changes listed in the baseline audit.
5. Run `npm test`, `npm run typecheck`, and `npm run lint`.

## Recommended next phase

After separate approval, use one approved physical device and staff test
account to complete the documented safe provider-notification test. Verify the
controlled-recipient audit first and do not create a real classroom alert.

Severity prioritizes human review based on observable transcript and acoustic
evidence. It does not confirm bullying, determine intent, identify a speaker,
or establish guilt.

Remote push notification requires connectivity and successful delivery by the
notification provider. Immediate notification delivery is not guaranteed.
