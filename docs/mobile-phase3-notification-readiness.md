# EchoSense Phase 3 mobile notification readiness

Date: 2026-08-10

Status: implemented, statically verified, and physically verified on Android.

## API environments

The runtime reads `EXPO_PUBLIC_API_BASE_URL`, trims trailing slashes, and rejects empty, malformed, credential-bearing, path-bearing, query-bearing, or fragment-bearing values. When the variable is absent, the safe fallback is:

`https://echosense-backend-75h3.onrender.com`

The profiles are intentionally separate:

| Profile | Environment | API |
| --- | --- | --- |
| local/LAN development | `development` | `http://192.168.1.92:8000` |
| EAS development | `development` | `http://192.168.1.92:8000` |
| EAS preview | `preview` | `https://echosense-backend-75h3.onrender.com` |
| EAS production | `production` | `https://echosense-backend-75h3.onrender.com` |

Copy `.env.example` to `.env.local` for local LAN work. No secret belongs in either file. Preview and production reject plain HTTP. Android cleartext traffic is enabled by `expo-build-properties` only when the app environment is `development` and the resolved API URL is HTTP; it is false for the default, preview, and production configurations.

For the LAN development profile, iOS also declares local-network usage and enables ATS local networking without enabling global arbitrary loads. Those keys are absent from preview and production. Changing the build-properties plugin, iOS Info.plist values, or notification plugin configuration requires a new native build. A JavaScript reload cannot apply manifest, Info.plist, or notification default-channel changes.

## Finalized classroom push contract

Finalized Phase 3 classroom application data contains exactly:

```json
{
  "type": "classroom_alert",
  "alertId": 123,
  "event_id": "123e4567-e89b-42d3-a456-426614174000",
  "severity": "high",
  "severityLevel": "HIGH",
  "trigger_type": "KEYWORD",
  "route": "/alert/123",
  "is_test": false
}
```

The parser requires all eight keys and rejects every unknown key. `alertId` is a positive safe integer or a canonical positive numeric string. `event_id` is a UUID. Both severity fields normalize to LOW, MEDIUM, or HIGH and must agree. `trigger_type` is exactly KEYWORD, ACOUSTIC, or TEST. The route must exactly equal `/alert/<normalized alertId>`. TEST is valid only when `trigger_type=TEST` and `is_test=true`; non-TEST triggers require `is_test=false`.

The supplied route is validated but never used as an arbitrary navigation target. The app constructs `/alert/[id]` from the normalized numeric ID.

An explicit compatibility path remains for the older route-free classroom shape with no `type`. It accepts only its previous allowlisted ID, severity, event-ID, and `isHigh` aliases. It cannot carry TEST state or a route. A partial payload with `type=classroom_alert` is not treated as legacy.

## Privacy and rejection policy

Finalized payloads fail closed for malformed IDs, malformed UUIDs, severity conflicts, TEST conflicts, arbitrary routes, missing keys, and unknown keys. Known sensitive keys are explicitly rejected, including transcript/transcription, monitored terms, detected words, evidence, raw audio, student/speaker/user identity, classroom/school identity, credentials, JWT, authorization, password, and push-token fields.

Rejected payload contents, title/body, JWTs, and full Expo tokens are not logged. Background and terminated notification text can be rendered by the operating system before JavaScript validation, so the backend/provider must enforce the same privacy rules.

## Trusted intent and navigation

After exact envelope validation and a user tap, the app persists only:

```json
{
  "type": "classroom_alert",
  "alertId": 123,
  "eventId": "123e4567-e89b-42d3-a456-426614174000",
  "severity": "HIGH",
  "triggerType": "KEYWORD",
  "isTest": false,
  "receivedAt": "<local ISO timestamp>"
}
```

No route, transcript, evidence, identity, credential, or token is stored. Intents older than 24 hours, implausibly future-dated intents, malformed stored values, and unknown stored keys are discarded. Navigation waits for authentication restoration and router readiness. The authenticated detail screen then performs `GET /alerts/{id}` with the SecureStore-backed JWT.

Foreground receipt never navigates automatically. Foreground taps, background taps, and cold-start taps use the same validation and typed-intent flow. The last notification response is checked during startup. Listener subscriptions are removed during cleanup.

## Sound and badge policy

All validated foreground categories use:

- `shouldShowAlert: true`
- `shouldShowBanner: true`
- `shouldShowList: true`
- `shouldPlaySound: true`
- `shouldSetBadge: false`

The no-badge policy is explicit because the app does not maintain an authoritative unread count. LOW, MEDIUM, HIGH, finalized alert TEST, and provider-only TEST are audible when device settings permit.

For background and terminated delivery, the backend/provider must request `sound="default"`. The operating system controls visible presentation and sound. The app does not claim that JavaScript can repair a missing provider sound request.

## Android channels

Channels are requested at module startup and are also awaited before push-token registration can complete.

| ID | Purpose | Importance | Sound | Vibration | Lock screen |
| --- | --- | --- | --- | --- | --- |
| `echosense-phase3-alerts` | LOW and MEDIUM classroom alerts, including applicable alert TEST | DEFAULT | `default` | enabled, `[0,250,150,250]` | PRIVATE |
| `echosense-high-alerts` | HIGH classroom alerts | HIGH | `default` | enabled, `[0,300,150,450]` | PRIVATE |
| `echosense-alerts` | provider-only delivery test | DEFAULT | `default` | enabled, `[0,200,150,200]` | PRIVATE |

`app.json` uses `echosense-phase3-alerts` as the default channel. The backend/provider must still select the correct channel for HIGH and provider-only test messages.

Earlier installed versions created `echosense-alerts` as silent. Android generally preserves an installed channel’s original sound settings. A clean uninstall/reinstall is therefore required before the controlled Android sound test. Reinstalling deletes local app data and requires signing in and registering the device again.

## iOS behavior

iOS uses standard notification authorization and default notification sound. It does not request Critical Alerts entitlement and does not claim emergency delivery. Foreground validated notifications request sound. Background/terminated sound requires the provider payload’s default-sound request and the user’s iOS notification/sound settings. Diagnostics show `ios.allowsSound` when the runtime exposes it.

## TEST categories

### Finalized alert TEST

This is a real alert-shaped object and requires an alert ID. Its exact copy is:

- Title: `EchoSense Alert — TEST`
- Body: `TEST possible verbal-aggression event. Human review required.`

It requires `trigger_type=TEST`, `is_test=true`, the finalized route, and all finalized fields. A tap opens the authenticated alert. The detail screen shows a TEST banner only when the validated notification event ID agrees with the fetched alert event ID.

### Provider-only test

The provider-only contract remains:

```json
{
  "type": "provider_test",
  "test_id": "safe-test-id",
  "route": "/notifications/test",
  "severity": "LOW",
  "is_test": true
}
```

It does not represent or create a classroom alert. It keeps `/notifications/test`, privacy-safe copy, a masked test reference, and a local receipt timestamp. It is audible under the final controlled-test policy.

## Push registration and diagnostics

Registration still requires authentication, a physical device, a supported non-Expo-Go build, notification permission, and a valid Expo push token. Permission query/request, token acquisition, SecureStore read/write, and backend failures return separate statuses instead of escaping into authentication. Sign-in succeeds before notification setup begins.

The same user/token pair is not posted twice. Registration is retried on app foreground. A supported Expo native token-change listener triggers safe Expo-token re-resolution and backend registration. Both token and app-state listeners are removed on cleanup. Concurrent registration for the same user is coalesced.

The authenticated Profile diagnostics section shows only privacy-safe facts: physical-device detection, build support, notification permission, iOS sound permission, registered/not-registered state without the token, last status, expected Android channels, backend host, and reinstall guidance. It never displays the Expo token or JWT.

## Alert detail compatibility

Alert IDs are revalidated as positive safe integers before fetch. `GET /alerts/{id}` handles 401/403 as unauthorized, 404 as unavailable, malformed responses as invalid-response, and transport failures as network errors. The UI uses possible-event and human-review wording and never depends on push-carried transcript or evidence.

## Physical-device verification

The production-style Android APK was clean-installed on a physical Tecno phone and verified with the authenticated production backend registration flow. Controlled provider-only notifications reached the phone through Expo and FCM with visible presentation, sound, vibration, and working tap navigation. A controlled classroom alert also completed the local FastAPI → shared Neon → Expo → FCM → physical Android flow and opened the authenticated alert details experience.

This checkpoint does not claim iOS delivery verification or app-state combinations that were not explicitly observed. Static checks still cannot replace device verification of OEM channel behavior, notification settings, or future provider payload changes.

Before a controlled test:

1. Build a fresh development client with the development EAS profile or a local native build.
2. Clean-uninstall the older Android app before installing the new Android build.
3. Confirm the phone can reach `192.168.1.92:8000` on the same LAN for development.
4. Sign in using an approved test account and confirm Profile diagnostics.
5. Verify the backend outer message uses `sound="default"` and the exact channel ID.
6. Test foreground, background, and terminated tap behavior separately on Android and iPhone.
7. Confirm sound using device settings; do not infer it from code or simulator behavior.

The physical verification used the approved EAS Android build and controlled notification paths. No credentials, push tokens, or sensitive notification payloads are recorded in this document.
