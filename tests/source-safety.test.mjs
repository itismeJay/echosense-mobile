import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const repositoryRoot = path.resolve(import.meta.dirname, '..');

async function sourceFiles(directory) {
  const entries = await readdir(path.join(repositoryRoot, directory), {
    withFileTypes: true,
  });
  const files = [];
  for (const entry of entries) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(relative)));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(relative);
  }
  return files;
}

async function read(relativePath) {
  return readFile(path.join(repositoryRoot, relativePath), 'utf8');
}

test('staff navigation exposes the four teacher-friendly primary destinations', async () => {
  const layout = await read('app/_layout.tsx');
  for (const route of ['index', 'alerts', 'history', 'profile']) {
    assert.match(layout, new RegExp(`name="${route}"`));
  }
  assert.match(layout, /href: showReports \? '\/analytics' : null/);
  assert.match(layout, /name="settings" options=\{\{ href: null \}\}/);
});

test('teacher cards omit technical evidence and use a details action', async () => {
  const card = await read('components/AlertCard.tsx');
  assert.match(card, /View details/i);
  assert.doesNotMatch(
    card,
    /confidence|yamnet|zero.crossing|energy.variance|waveform|duration/i
  );
});

test('technical alert evidence is gated to administrators', async () => {
  const details = await read('app/alert/[id].tsx');
  assert.match(details, /canViewTechnicalDetails\(user\?\.role\)/);
  assert.match(details, /Technical details/i);
});

test('polling does not schedule local notifications', async () => {
  const files = [
    ...(await sourceFiles('app')),
    ...(await sourceFiles('lib')),
  ];
  const source = (
    await Promise.all(files.map(async (file) => `${file}\n${await read(file)}`))
  ).join('\n');
  assert.doesNotMatch(source, /scheduleNotificationAsync/);
});

test('Expo Go startup does not eagerly load unsupported notifications', async () => {
  const startupFiles = [
    await read('app/_layout.tsx'),
    await read('app/profile.tsx'),
    await read('lib/notifications.ts'),
  ];
  for (const source of startupFiles) {
    assert.doesNotMatch(
      source,
      /import \* as Notifications from 'expo-notifications'/
    );
  }

  const runtime = await read('lib/notificationRuntime.ts');
  const expoGoGuard = runtime.indexOf('if (isExpoGo) return null;');
  const dynamicImport = runtime.indexOf(
    "notificationsPromise ??= import('expo-notifications')"
  );
  assert.ok(expoGoGuard >= 0);
  assert.ok(dynamicImport > expoGoGuard);
});

test('push tokens and notification payloads are not printed', async () => {
  const login = await read('app/login.tsx');
  const notifications = await read('lib/notifications.ts');
  const source = `${login}\n${notifications}`;
  assert.doesNotMatch(source, /console\.(?:log|info|warn|error)\([^)]*(?:pushToken|data|PROJECT_ID)/);
  assert.doesNotMatch(source, /token received|push token:/i);
  assert.doesNotMatch(source, /console\.(?:log|info|warn|error)\([^)]*token/i);
});

test('push registration and logout use the authenticated existing backend route', async () => {
  const api = await read('lib/api.ts');
  const notifications = await read('lib/notifications.ts');
  const profile = await read('app/profile.tsx');
  assert.match(api, /client\.post\('\/users\/push-token', \{ token \}\)/);
  assert.match(api, /Authentication required/);
  assert.match(profile, /await clearPushRegistration\(\);\s+await logout\(\);/);
  assert.match(notifications, /PUSH_REGISTRATION_KEY/);
});

test('successful authentication does not await notification setup', async () => {
  const login = await read('app/login.tsx');
  const layout = await read('app/_layout.tsx');
  assert.doesNotMatch(login, /await syncPushRegistration/);
  assert.match(login, /onSignIn\(signedInUser\)/);
  assert.match(layout, /void syncPushRegistration\(userId\)/);
});

test('notification channels are initialized before registration completes', async () => {
  const layout = await read('app/_layout.tsx');
  const notifications = await read('lib/notifications.ts');
  assert.match(layout, /ensureAndroidNotificationChannels\(\)/);
  assert.match(notifications, /await ensureAndroidNotificationChannels\(\)/);
});

test('notification navigation persists authenticated targets and handles cold starts', async () => {
  const layout = await read('app/_layout.tsx');
  assert.match(layout, /getLastNotificationResponseAsync/);
  assert.match(layout, /clearLastNotificationResponseAsync/);
  assert.match(layout, /storePendingNotificationIntent/);
  assert.match(layout, /resolvePendingNotificationAction/);
  assert.match(layout, /action\.type === 'navigate-alert'/);
  assert.match(layout, /pathname: '\/alert\/\[id\]'/);
  assert.match(layout, /action\.type === 'navigate-provider-test'/);
  assert.match(layout, /pathname: '\/notifications\/test'/);
  assert.match(layout, /navigationState\?\.key/);
});

test('provider-test route is authenticated and contains no classroom detail UI', async () => {
  const screen = await read('app/notifications/test.tsx');
  assert.match(screen, /if \(!isAuthenticated\)/);
  assert.match(screen, /<Redirect href="\/login" \/>/);
  assert.match(screen, /Notification test received/);
  assert.match(screen, /No classroom alert was created/);
  assert.doesNotMatch(
    screen,
    /SeverityBadge|severity_evidence|Stored transcript|matched terms|YAMNet/i
  );
  assert.doesNotMatch(
    screen,
    /push.?token|auth.?token|user\.email|classroom room|student/i
  );
});

test('provider-test validation uses exact copy and an allowlisted route', async () => {
  const payload = await read('lib/notificationPayload.ts');
  assert.match(payload, /PROVIDER_TEST_TITLE = 'EchoSense notification test'/);
  assert.match(
    payload,
    /No classroom alert was created/
  );
  assert.match(payload, /PROVIDER_TEST_ROUTE = '\/notifications\/test'/);
  assert.match(payload, /hasExactKeys\(data, PROVIDER_TEST_KEYS\)/);
  assert.match(payload, /data\.is_test !== true/);
  assert.match(payload, /data\.severity !== 'LOW'/);
});

test('alert detail renders the backend evidence contract and review wording', async () => {
  const details = [
    await read('app/alert/[id].tsx'),
    await read('lib/alertEvidence.ts'),
    await read('lib/types.ts'),
  ].join('\n');
  for (const field of [
    'transcribed_text',
    'language',
    'severity',
    'created_at',
    'matched_terms',
    'event_id',
    'yamnet_ran',
  ]) {
    assert.match(details, new RegExp(field));
  }
  assert.match(details, /HUMAN_REVIEW_WORDING/);
  assert.match(details, /EVIDENCE_REVIEW_NOTE/);
});

test('alert detail labels validated TEST navigation only after event agreement', async () => {
  const details = await read('app/alert/[id].tsx');
  assert.match(details, /notificationTest/);
  assert.match(details, /notificationEventId/);
  assert.match(details, /alert\.event_id\?\.toLowerCase\(\)/);
  assert.match(details, /TEST alert data/);
});

test('user-facing alert wording never claims confirmed bullying', async () => {
  const source = [
    ...(await sourceFiles('app')),
    ...(await sourceFiles('components')),
    ...(await sourceFiles('lib')),
  ];
  const contents = (
    await Promise.all(source.map(async (file) => await read(file)))
  ).join('\n');
  assert.doesNotMatch(contents, /confirmed bullying|bullying detected|establishes guilt/i);
});

test('teacher screens include loading, empty, error, and offline wording', async () => {
  const source = [
    await read('app/index.tsx'),
    await read('app/alerts.tsx'),
    await read('app/history.tsx'),
  ].join('\n');
  assert.match(source, /Loading classroom alerts/);
  assert.match(source, /No alerts need attention right now/);
  assert.match(source, /No previous alerts were found/);
  assert.match(source, /We couldn’t load classroom alerts/);
  assert.match(source, /OfflineBanner/);
});

test('alert details and primary actions expose accessibility labels', async () => {
  const source = [
    await read('components/AlertCard.tsx'),
    await read('app/alert/[id].tsx'),
    await read('app/login.tsx'),
  ].join('\n');
  assert.match(source, /accessibilityLabel/);
  assert.match(source, /accessibilityRole="button"/);
  assert.match(source, /accessibilityLiveRegion/);
});
