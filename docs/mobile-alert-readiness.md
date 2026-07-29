# EchoSense mobile alert readiness

## Production contract

- Backend: `https://echosense-backend-75h3.onrender.com`
- Authentication: `POST /auth/login`, followed by bearer-authenticated
  `GET /auth/me` for session restoration.
- Push registration: bearer-authenticated `POST /users/push-token` with
  `{ "token": "<Expo push token>" }`.
- Alert detail: bearer-authenticated `GET /alerts/{alert_id}`.
- Current push data payload: `{ "alertId": <integer>, "severity": "<value>" }`.
  The app also accepts `alert_id` as a legacy compatibility key. It does not
  infer `event_id`, `route`, or other fields that the backend does not send.
- Push title: `Possible aggression alert`
- Push body:
  `Unverified possible-aggression alert. Human review required.`

The push payload does not contain the transcript. Full stored evidence is
loaded only after an authorized user opens the alert detail route.

## Permission and token behavior

- iOS and Android both check current permission before requesting it.
- A request is made only while status is `undetermined`. A previous denial is
  respected and explained without blocking alert review in the app.
- Remote push registration is skipped safely in simulators/emulators and Expo
  Go. A physical device with a development or production build is required.
- The EAS project ID is resolved from runtime EAS/Expo configuration and has a
  configured fallback matching `app.json`.
- On every authenticated app start and successful sign-in, the app obtains the
  current Expo push token. The same token/user pair is not posted twice.
- A changed token or app reinstall is registered on the next authenticated
  start. A failed registration is retried on a later start.
- Full push tokens and authentication tokens are not printed.

Android notification channels are created for high and other priorities.
iOS presentation follows system permission and the app's foreground handler.
Remote notification display while backgrounded is handled by the operating
system; no background data-processing task or raw transcript is required.

## Navigation behavior

Notification response listeners are installed once and removed on cleanup.
Foreground delivery is deduplicated by alert ID without scheduling a second
local notification. Live, background, and terminated-app responses use the
same validated positive integer alert ID.

If the router or authentication is not ready, the alert ID is held in secure
device storage. An unauthenticated user is sent to sign-in, and the pending
alert opens only after authentication succeeds and the root router is ready.
Malformed or missing IDs are ignored safely. The consumed terminated-app
response is cleared to prevent reopening it on every launch.

## Evidence and roles

The detail screen displays the stored transcript without trimming or
normalizing it, language, severity, timestamp, matched terms, event ID,
`yamnet_ran` explanation, and the required human-review wording. Null legacy
fields use explicit unavailable states. Technical metrics remain
administrator-only.

Backend roles are `staff` (presented as Teacher), `counselor`, and `admin`.
Teachers can review alerts and history. Counselors and administrators also see
reports; system/technical details remain administrator-only. The current
backend returns the same authorized alert set to all three reviewer roles and
does not expose classroom assignments, so the mobile app does not claim
classroom-specific filtering.

## Token lifecycle limitation

The backend stores one token string per user, not multiple device records.
Explicit sign-out first posts an empty token for the authenticated user, using
the existing route, and clears local token association only after that request
succeeds. This prevents the ordinary sign-out/sign-in account-switch path from
leaving this device attached to the previous user.

There is no dedicated unregister endpoint, token-receipt cleanup, multi-device
support, or server-side exclusion of blank tokens in normal broadcast mode.
Those backend limitations must be addressed before claiming a complete
multi-device lifecycle.

## Controlled device gate

Before creating a controlled alert, an operator must use the approved physical
device and account to:

1. Install the development or production build (not Expo Go).
2. Sign in and grant notification permission.
3. Confirm the mobile registration request succeeds.
4. From an administrator session, confirm
   `GET /users/notification-recipient-audit` reports controlled mode, exactly
   one eligible recipient, and `has_push_token: true`.
5. Open an existing safe alert and compare its displayed transcript with the
   API response.

Do not expose the token while recording these checks.
