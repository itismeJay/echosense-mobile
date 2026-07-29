# Mobile severity and notification baseline audit

Audit date: 2026-07-30
Scope: `/Users/jay/echosense-mobile`, read-only frontend terminology review,
and GET-only production OpenAPI inspection.

Existing uncommitted changes were present before this phase in `app.json`,
`app/_layout.tsx`, `app/login.tsx`, `lib/api.ts`, `lib/auth.ts`,
`package.json`, `package-lock.json`, `tsconfig.json`, `.npmrc`, and
`.claude/settings.local.json`. They were preserved.

| Requirement | Baseline status | Relevant files | Baseline behavior | Missing work | Risk | Recommended implementation |
| --- | --- | --- | --- | --- | --- | --- |
| Canonical severity | Partial | `lib/types.ts`, `lib/presentation.ts`, `components/SeverityBadge.tsx` | Upper/lowercase values displayed, but every invalid value became LOW | Preserve an invalid state | Incorrect review priority | Normalize valid values only; render invalid as unavailable |
| Alert response contract | Partial | `lib/types.ts`, `lib/api.ts` | Axios responses were cast directly to `Alert` | Runtime parsing and new fields | Malformed data could reach UI | Parse required fields and safely ignore unknown optional fields |
| Severity evidence | Missing | `lib/types.ts`, `app/alert/[id].tsx` | `severity_evidence` and `review_notice` were not in the mobile type or detail UI | Full evidence states and labels | Evidence unavailable to reviewers | Add structured type, parser, and plain-language detail section |
| Historical null evidence | Missing | `app/alert/[id].tsx` | No explicit historical evidence state | Truthful null message | Empty or misleading detail | Distinguish null, omitted, empty, and malformed evidence |
| Exact transcript | Present | `lib/alertEvidence.ts`, `app/alert/[id].tsx` | Stored `transcribed_text` was returned without normalization | `transcript` alias | Compatibility gap | Preserve either response field exactly |
| Alert list | Partial | `components/AlertCard.tsx`, `app/alerts.tsx`, `app/history.tsx` | Priority, location, timestamp, status, and review caveat were shown | Severity-specific title, language, compact indicator | Less scannable review queue | Add responsible title, language, and review-required label |
| Human-review wording | Partial | `lib/alertEvidence.ts`, details and cards | Required fallback wording existed, but backend notice was not rendered | Backend-first notice | Contract wording ignored | Use non-empty backend `review_notice`, otherwise exact fallback |
| Push copy | Partial | `lib/presentation.ts`, operating-system remote display | Remote title/body were not locally replaced; local helper still used generic copy | Distinct testable templates and structural checks | Regression to generic/stronger wording | Preserve valid remote copy and test severity templates |
| Notification payload safety | Partial | `lib/notifications.ts`, `lib/notificationDedup.ts` | Numeric `alertId`/`alert_id` was extracted, but foreground display allowed missing IDs | Reject unsafe/malformed data | Unroutable or sensitive notification | Require stable alert ID and reject transcript/identity data keys |
| Notification navigation | Partial | `app/_layout.tsx` | Foreground/background/cold response listeners existed and were deduplicated | Pending target was cleared while unauthenticated | Post-login resume failed | Retain only validated alert ID until authentication and router readiness |
| Listener lifecycle | Present | `lib/notificationListeners.ts`, `app/_layout.tsx` | Module manager enforced one received and one response listener with cleanup | More routing tests | Low | Keep manager and add cold/auth route tests |
| Push token lifecycle | Partial | `lib/pushRegistration.ts`, `lib/notifications.ts`, `app/profile.tsx` | Registration occurred after auth, duplicate same-user/token posts were avoided, retry occurred on later startup, logout posted blank token before clearing local state | Physical-device messaging and limitation docs | Backend supports only one token string per user | Preserve one-token semantics and document it |
| Permission flow | Present | `lib/pushRegistration.ts`, `app/login.tsx`, `app/profile.tsx` | Undetermined permission was requested; denial did not block sign-in | Simulator message | Users may expect simulator push | Explain physical-device/build requirement |
| Android channels | Partial | `app/_layout.tsx` | `high-alerts` and `other-alerts` were created without descriptions | Stable requested IDs and responsible descriptions | Channel/backend mismatch | Define two exported channel configs and document Android immutability |
| iOS behavior | Partial | `app/_layout.tsx`, `app.json` | Standard foreground presentation and response handling; no Critical Alerts feature | Explicit limitations | Incorrect high-priority expectation | Document normal notifications and user-controlled previews |
| Authentication | Present with gap | `lib/auth.ts`, `lib/api.ts`, `app/_layout.tsx` | SecureStore token, `/auth/me` restoration, protected routes, and 401 invalidation existed | Explicit 403/404 detail states and post-login resume | Confusing errors | Keep protected fetch and add safe status-specific UI |
| Offline/errors | Partial | list/detail screens | Retry UI existed | Truthful synchronization language and invalid-response state | Could imply an alert was lost | Add no-loss/no-immediate-delivery wording |
| Automated verification | Present, incomplete | `tests/` | 44 tests passed; TypeScript and lint passed | Contract, evidence, payload, route, channel tests | Regressions untested | Expand pure unit and source integration coverage |
| Expo/device readiness | Partial | `app.json`, `eas.json` | Expo SDK 54, RN 0.81.5, Router 6, valid EAS project ID | Exports, doctor, device availability audit | Device-only issues remain | Export supported platforms and document controlled test gate |

## Production OpenAPI observations

GET `https://echosense-backend-75h3.onrender.com/openapi.json` reported:

- EchoSense API version `1.0.0`.
- `AlertResponse` includes `id`, `event_id`, `severity`,
  canonical `severity_level`, nullable `severity_evidence`, confidence,
  duration, location, status, timestamp, transcript/acoustic fields,
  language fields, matched terms, categories, and `review_notice`.
- `SeverityLevel` is exactly `LOW`, `MEDIUM`, or `HIGH`.
- `SeverityEvidence` contains canonical `level`, at least one `reasons` item
  in the production schema, optional `term_categories`, and optional
  `supporting_evidence`.
- Alert list/detail routes and push-token update routes are present.
- Push registration is a single string at `POST /users/push-token`; the
  OpenAPI does not describe a multi-device token collection.

No protected alert data was requested. No production POST request, alert, or
push notification was made.
