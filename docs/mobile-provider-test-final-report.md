# Mobile provider-test notification implementation report

Date: 2026-07-30

Stage result: **IMPLEMENTED AND VERIFIED**

## Baseline limitation

The previous mobile parser accepted only classroom-alert notifications with a
positive alert ID and one of the LOW, MEDIUM, or HIGH templates. A harmless
provider-level test without an alert ID was rejected before presentation,
deduplication, or navigation.

The detailed baseline is in
`docs/mobile-provider-test-baseline-audit.md`.

## Final provider-test contract

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

Allowed keys are exactly `type`, `test_id`, `route`, `severity`, and
`is_test`. The provider test does not accept or require `alertId`.

The only accepted title is:

`EchoSense notification test`

The only accepted body is:

`This is a controlled delivery test for the approved device. No classroom alert was created.`

Alternate copy, routes, type values, severity values, false/missing test
markers, empty/malformed IDs, unknown keys, and alert IDs fail closed.

Sensitive transcript, hit, category, waveform, audio, student, speaker, user,
accusation, credential, password, authorization, access-token, and push-token
fields are rejected. No raw payload or protected alert data is stored or
displayed.

## Navigation and authentication

Foreground presentation accepts only the exact envelope and does not
auto-navigate. Foreground taps, background taps, and cold-start responses use
the same exact validation.

The app persists only a typed intent:

- classroom alert: validated positive alert ID
- provider test: validated test ID and locally generated ISO receipt time

No notification-supplied route is persisted. The provider destination is fixed
in application code as `/notifications/test`. If authentication is not ready,
the intent waits at login and resumes after a successful session restoration
or sign-in. Invalid stored state is removed.

The test screen independently requires authentication, clearly says no
classroom alert was created, masks the test ID, and shows only local receipt
time and platform. It contains no classroom detail components or protected
alert fields.

## Deduplication and platforms

Provider tests use `provider_test:<test_id>` and classroom alerts use
`classroom_alert:<alertId>`. These identities cannot collide. Received and tap
deduplication remain separate, process-local ten-minute windows, so a test can
be shown once and then opened once. Provider-level exactly-once delivery is not
claimed.

Android provider tests use `echosense-alerts`, the existing normal-importance
channel, and never `echosense-high-alerts`. No emergency or repeating sound was
added. The remote provider message must select the normal channel outside the
strict application data object.

iOS provider tests use ordinary notifications. No Critical Alerts entitlement,
emergency behavior, or accusation action was added.

## Files added

- `app/notifications/test.tsx`
- `docs/mobile-provider-test-baseline-audit.md`
- `docs/mobile-provider-test-final-report.md`

## Files modified

- `app/_layout.tsx`
- `docs/mobile-alert-readiness.md`
- `lib/notificationChannels.ts`
- `lib/notificationNavigation.ts`
- `lib/notificationPayload.ts`
- `lib/notifications.ts`
- `tests/notificationChannels.test.mjs`
- `tests/notificationDedup.test.mjs`
- `tests/notificationNavigation.test.mjs`
- `tests/notificationPayload.test.mjs`
- `tests/source-safety.test.mjs`

## Verification

| Check | Result |
| --- | --- |
| Automated tests | 80 passed, 0 failed |
| TypeScript | Passed |
| Expo lint | Passed |
| Expo Doctor | 18/18 passed |
| Expo dependency validation | Dependencies up to date |
| Expo public configuration | Passed |
| Android export | Passed |
| iOS export | Passed |
| Web export | Passed |
| Provider route in Android export | Verified |
| Provider route in iOS export | Verified |
| Provider route in web export | Verified |
| Git whitespace check | Passed |
| Runtime prohibited-claim scan | No matches |
| Notification-send code scan | No additions |
| Source credential scan | No credentials found |
| Export credential scan | No credentials found; one Android icon-name concatenation was reviewed as a false positive |

The Node test runner continues to emit its existing non-failing
module-type performance warning because the project is not declared as ESM.

## Privacy and limitations

- No notification, classroom alert, microphone input, detection pipeline, or
  production API request was invoked.
- The mobile app can validate foreground presentation and all tap handling.
  Background/terminated notification text may be rendered by the operating
  system before JavaScript validation, so the provider must send the exact
  approved privacy-safe copy.
- Deduplication is process-local, not permanent or provider exactly-once.
- Remote delivery still requires connectivity and successful provider
  delivery.
- A physical-device push test was not performed in this phase.
- Existing one-push-token-per-user backend limitations remain unchanged.

## Git and rollback

The implementation is intended for one focused commit:

`feat: add safe provider test notification flow`

The tracked machine-specific `.claude/settings.local.json` remains outside the
implementation commit. If rollback is needed after publication, create and
push a normal revert commit; do not rewrite shared history.

## Recommended next phase

Resume Controlled Recipient Audit and Physical Push-Notification Verification.
Use one approved physical device and controlled recipient, and begin with the
documented harmless provider test. Do not create a classroom alert.

This provider notification test verifies mobile push delivery and navigation
only. It does not create a classroom alert and does not test microphone
detection, transcription, severity classification, or edge outbox delivery.
