# EchoSense mobile severity and notification readiness

Last updated: 2026-08-04

> Phase 3 notification compatibility, sound policy, environment configuration,
> rebuild requirements, and the current physical-device gate are authoritative
> in `docs/mobile-phase3-notification-readiness.md`. Notification-specific
> behavior recorded below describes the earlier phase where LOW/MEDIUM and the
> provider channel were silent.

## Safety statement

Every alert is an unverified possible-aggression alert requiring human review.

Severity prioritizes human review based on observable transcript and acoustic
evidence. It does not confirm bullying, determine intent, identify a speaker,
or establish guilt.

Remote push notification requires connectivity and successful delivery by the
notification provider. Immediate notification delivery is not guaranteed.

## Mobile alert contract

The mobile API layer runtime-parses protected alert list, history, and detail
responses before data reaches the UI.

Supported fields are:

- `id` (positive backend alert ID used for detail navigation)
- `event_id` (supporting edge identity)
- `severity` and canonical `severity_level`
- nullable structured `severity_evidence`
- nullable `review_notice`
- exact `transcript` or production `transcribed_text`
- `language` and optional `language_confidence`
- `confidence`, `duration`, `location`, `status`, and `created_at`
- `matched_terms`, `categories`, and optional `track`
- `yamnet_ran`, `yamnet_class`, and `yamnet_score`
- existing optional tone/acoustic fields

Unknown optional response fields are ignored. Raw audio is neither copied into
the mobile model nor processed. Required malformed response shapes fail with a
generic safe UI message; response bodies and alert payloads are not logged.

Valid uppercase and lowercase severity values normalize to `low`, `medium`, or
`high`. Invalid values remain `unknown`; they are never silently downgraded to
LOW.

## Severity rendering

List and detail titles are:

| Severity | Teacher-facing title |
| --- | --- |
| LOW | Possible classroom concern |
| MEDIUM | Possible verbal-aggression indicators |
| HIGH | High-priority classroom alert |
| Invalid | Alert severity unavailable |

Cards also show the timestamp, language, current location when returned,
review-required indicator, and review status in history where already
supported. HIGH is visually prominent without emergency or accusation
wording.

## Severity-evidence display

The protected detail screen includes a “Why this alert was prioritized”
section with:

- primary reasons
- matched evidence categories and stored matched phrases
- supporting acoustic or context evidence

Raw JSON is never displayed. Shared evidence-key labels intentionally match
the frontend:

| Backend key | Plain-language label |
| --- | --- |
| `term_category:self_harm_directive` | Severe self-harm directive detected in the transcript |
| `self_harm_directive` | Severe self-harm directive |
| `laughter_or_excitement_marker_present` | Laughter or excitement was present, but it did not cancel the stronger text evidence |

Other keys use the same neutral humanization strategy as the frontend. The
mobile app does not assign a stronger meaning that is absent from the shared
contract.

The detail screen also shows stored severity, review notice, exact transcript,
language and available confidence, matched terms, categories, duration,
detection confidence, event ID, timestamp, YAMNet execution state/class/score,
and existing tone/acoustic indicators. Raw technical metrics remain restricted
to the existing administrator role.

## Historical and malformed evidence

Evidence states remain distinct:

- Backend `null`:
  “Detailed severity evidence was not recorded for this historical alert.”
- Valid object with no evidence items:
  “Severity evidence was recorded, but no detailed reasons were included.”
- Malformed optional evidence:
  “Detailed severity evidence could not be displayed because its recorded
  format was invalid.”
- Omitted evidence:
  “Detailed severity evidence is unavailable for this alert.”

The stored severity remains visible. The app does not infer reasons from the
transcript and does not expose malformed evidence content.

## Human-review notice

A non-empty backend `review_notice` is displayed unchanged. If it is null,
empty, or missing, the fallback is:

“Unverified possible-aggression alert. Human review required.”

## Notification templates and payload

The backend-provided notification title and body remain the displayed copy
when they exactly match the responsible template for the validated severity.
The mobile app does not replace them with stronger local claims; unexpected
foreground copy is suppressed.

Expected templates:

| Severity | Title | Body |
| --- | --- | --- |
| LOW | Possible classroom concern | A low-severity unverified alert requires staff review. |
| MEDIUM | Possible verbal-aggression indicators | A medium-severity unverified alert requires staff review. |
| HIGH | High-priority classroom alert | Strong possible-aggression indicators were detected. Prompt human review is recommended. |

Notification data must include `alertId` (or legacy `alert_id`) as a positive
integer. `event_id`/`eventId` may be retained as supporting identity but is not
used instead of the backend alert ID. Severity may be supplied as `severity`
or `priority`.

Foreground display and tap handling reject data containing transcript,
matched-term, raw-audio, student, or speaker fields. The remote backend must
also keep notification title/body privacy-safe because background and
terminated-app notification UI is rendered by the operating system before
application JavaScript can inspect it.

## Controlled provider-test notification

The mobile app supports one separate provider-level delivery-test contract.
It is not parsed as a classroom alert and does not create or store an alert.

The application data must contain exactly:

```json
{
  "type": "provider_test",
  "test_id": "safe-test-id",
  "route": "/notifications/test",
  "severity": "LOW",
  "is_test": true
}
```

The only allowed application data keys are `type`, `test_id`, `route`,
`severity`, and `is_test`. The test ID must be a non-empty identifier of at
most 128 characters using letters, digits, `.`, `_`, `:`, or `-`. The route,
LOW severity, and boolean test marker must match exactly. An `alertId`, an
unknown key, an alternate route, or a sensitive key causes the payload to be
rejected.

The only accepted provider-test copy is:

- Title: `EchoSense notification test`
- Body:
  `This is a controlled delivery test for the approved device. No classroom alert was created.`

Alternate copy is rejected for foreground presentation and tap handling.
Valid remote wording is displayed unchanged.

Known sensitive fields are rejected for both notification variants, including
transcript, matched-term, hit-list, category, waveform, raw-audio, student,
speaker, user-identity, accusation, credential, access-token, and push-token
fields. Provider tests also use a strict allowlist, so differently named or
future fields fail closed.

For compatibility with the currently deployed classroom-alert sender, the
existing allowlisted alert shape may omit `type`. It must still contain a
positive `alertId` or `alert_id`, valid LOW/MEDIUM/HIGH severity, and only the
known classroom notification keys. An explicit unknown `type` is never
defaulted to a classroom alert.

### Provider-test receipt and navigation

- Foreground delivery uses the existing notification handler, accepts only
  the exact contract and copy, and does not navigate automatically.
- A foreground, background, or cold-start tap is validated before any intent
  is stored.
- The app stores only a typed `provider_test` intent containing the validated
  test ID and a locally generated receipt timestamp. It does not store the
  notification payload or a route supplied by the provider.
- The destination is fixed in application code as `/notifications/test`.
- If signed out or the session has expired, the intent waits at sign-in and
  resumes only after authentication and router restoration.
- Invalid stored state is removed and never used for navigation.
- The test screen is authentication-aware, identifies itself as a delivery
  test, masks the test ID, and shows only the local receipt time and platform.
  It contains no classroom transcript, evidence, room, student, alert ID,
  credential, or provider response.

Provider tests are deduplicated by a namespaced `test_id` key. Classroom
alerts remain deduplicated by a separately namespaced alert ID, so the two
variants cannot collide. Received-notification and response-tap deduplication
remain separate, allowing one notification to be presented and then opened.
Deduplication is process-local for ten minutes and does not claim
provider-level exactly-once delivery.

On Android, provider tests use the normal `echosense-alerts` channel and never
`echosense-high-alerts`. The channel has normal importance and its existing
ordinary presentation policy; no repeated alarm or emergency behavior is
added. The provider must select the same channel in the outer Android message.

On iOS, provider tests use ordinary notification permission and presentation.
They do not request or assume Critical Alerts entitlement and have no emergency
behavior.

This provider notification test verifies mobile push delivery and navigation
only. It does not create a classroom alert and does not test microphone
detection, transcription, severity classification, or edge outbox delivery.

## Listener lifecycle, duplicate protection, and navigation

A single module-level manager owns one received listener and one response
listener. Repeated setup returns the existing cleanup function. Cleanup removes
both subscriptions and permits a later safe restart.

Foreground presentation and response taps use separate ten-minute,
in-memory alert-ID deduplication windows. This prevents duplicate local
handling during a process lifetime; it does not claim provider-level
exactly-once delivery.

Navigation flow:

1. Validate notification data and extract only the positive alert ID.
2. Store that ID in encrypted device storage.
3. Wait for authentication restoration and router readiness.
4. If unauthenticated, show sign-in while retaining only the pending ID.
5. After successful sign-in, open `/alert/[id]`.
6. Fetch protected alert details with the current bearer session.
7. Show safe unauthorized, not-found, invalid-response, or retry states.
8. Clear the pending ID after routing.

Foreground, background, and cold-start responses use this flow. Alert content
is never stored in the route or shown before authentication. Explicit sign-out
clears the pending ID and notification deduplication state.

## Push-token registration

- Registration runs only with an authenticated user ID.
- Simulators/emulators return a physical-device-required state.
- Expo Go returns an unsupported-build state.
- Existing permission is checked first. The system prompt is requested only
  while permission is undetermined.
- Denial does not block sign-in or alert review.
- The EAS project ID is resolved from runtime configuration and matches
  `app.json`.
- Expo token format is validated.
- The same cached user/token pair is not posted twice.
- A new token or different authenticated user is registered.
- Temporary failure is returned truthfully and retried on a later app start or
  sign-in.
- Token and authentication values are not logged or displayed.
- A registration/sign-out race is cancelled and detached.

Explicit sign-out posts an empty token using the existing authenticated route
before local session removal. If detachment fails, sign-out stops and explains
that it could not complete safely.

The backend currently stores one push-token string per user. The mobile app
does not claim multi-device support. Signing in on another device may replace
the first device’s token.

## Android notification channels

Two stable channels are created:

| ID | Purpose | Importance | Sound |
| --- | --- | --- | --- |
| `echosense-alerts` | LOW and MEDIUM default | Default/normal | None |
| `echosense-high-alerts` | HIGH | High | Single default alert sound |

Descriptions say that alerts are unverified and require human review. No
repeating loop, siren, emergency-service behavior, or confirmed-danger wording
is configured.

Android channel behavior is partly controlled by the user. Once a channel has
been installed, some settings cannot be changed programmatically; users may
need to adjust device settings or reinstall a test build. The backend/provider
payload must select `echosense-high-alerts` for HIGH; otherwise Android uses
the configured default `echosense-alerts`.

## iOS behavior and limitations

The app uses standard iOS notification permission and foreground
banner/list/sound policy. Only validated HIGH data requests foreground sound.
Notification responses use the same authenticated routing path.

EchoSense does not request or assume Apple’s Critical Alerts entitlement. HIGH
is a review priority, not an Apple Critical Alert. No accusation, punishment,
or emergency action categories are added.

Lock-screen preview content and visibility are controlled partly by the user’s
iOS notification settings. The backend must continue sending privacy-safe
title/body text.

## Authentication and error behavior

Bearer tokens are held in secure device storage and are not printed. Startup
validates an unexpired session with `/auth/me`; transient outages retain a
locally valid session, while authenticated 401/403 validation failures clear
it. Delayed requests using an older token cannot erase a newer session.

Alert requests use the current token. A 401 causes safe session invalidation,
a 403 produces an inaccessible-alert state, and a 404 produces an unavailable
alert state. Axios response data is not cached by the app. Explicit logout
removes local authentication state only after safe push detachment.

Offline screens do not claim the edge alert was lost. They state that available
alerts can synchronize when connectivity returns and allow safe GET retries.
No UI promises immediate delivery.

## Physical-device test procedure

Do not create a production alert for readiness checking.

Prerequisites:

- approved physical Android or iOS device
- approved staff test account and credentials
- development or production build, not Expo Go
- notification permission enabled
- authenticated session
- valid Expo push token
- stable production backend
- controlled-recipient mode
- verified controlled recipient and no unrelated recipients
- approved controlled test phrase for a later, separately approved phase
- operator available at the Raspberry Pi for that later phase

Before any real test:

1. Confirm the signed-in account is the configured controlled recipient.
2. Confirm token registration succeeded without displaying the token.
3. From an approved administrator session, GET
   `/users/notification-recipient-audit`.
4. Require controlled mode, resolved recipient, exactly one eligible
   recipient, and `has_push_token: true`.
5. Confirm no other recipient will receive the test.
6. Confirm deployed LOW/MEDIUM/HIGH templates.
7. Confirm the installed build points to the production API.
8. Confirm permission is granted.
9. Prefer a provider test or other safe non-alert notification first.
10. Verify foreground receipt/tap, background receipt/tap, cold-start tap,
    title/body, channel or iOS behavior, duplicate handling, and session-expiry
    behavior.

Stop if any recipient, credential, token, channel, or controlled-mode check is
unknown. A real classroom-aggression alert and live microphone test require
separate explicit approval.

## Privacy constraints and known limitations

- No credentials, auth tokens, push tokens, transcript payloads, or complete
  alerts are logged.
- Notification data containing transcript or identity fields is rejected by
  foreground/tap handling, but background privacy ultimately depends on the
  backend/provider payload.
- No raw-audio support was added.
- Notification delivery is not exactly once and deduplication is process-local.
- The backend appears to support one push token per user, not multiple devices.
- The backend has no dedicated unregister endpoint; blank-token detachment uses
  the existing update route.
- Foreground LOW/MEDIUM preferences cannot suppress operating-system-rendered
  background notifications.
- HIGH Android channel selection requires matching provider payload data.
- Simulator/emulator and Expo Go environments cannot validate remote push.
- iOS lock-screen previews depend on device settings.
- No physical-device push receipt was performed in this implementation phase.
