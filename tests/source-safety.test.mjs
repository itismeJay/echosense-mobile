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

test('tabs come from the role table and hidden routes stay out of the tab bar', async () => {
  const layout = await read('app/_layout.tsx');
  assert.match(layout, /const tabs = visibleTabs\(user\)/);
  for (const tab of ['alerts', 'analytics', 'settings', 'profile']) {
    assert.match(layout, new RegExp(`name="${tab}" options=\\{tabOptions\\('${tab}'\\)\\}`));
  }
  for (const route of ['index', 'history', 'logs', 'login', 'change-password']) {
    assert.match(layout, new RegExp(`name="${route}" options=\\{\\{ href: null \\}\\}`));
  }
});

test('the tab bar is hidden and other screens blocked until the password is changed', async () => {
  const layout = await read('app/_layout.tsx');
  assert.match(layout, /const hideTabBar = !isAuthenticated \|\| mustChangePassword/);
  assert.match(layout, /href: tabs\.includes\(tab\) && !hideTabBar \? undefined : null/);
  assert.match(
    layout,
    /mustChangePassword &&\s+pathname !== '\/change-password'[\s\S]{0,120}router\.replace\('\/change-password'\)/
  );
  // Push registration waits for the change, then starts.
  assert.match(layout, /if \(!user\?\.id \|\| mustChangePassword\) return;/);
  assert.match(layout, /\}, \[user\?\.id, mustChangePassword\]\);/);
  // Notification taps wait too.
  assert.match(layout, /isAuthenticated: isAuthenticated && !mustChangePassword/);
});

test('staff screens never call report analytics or the dictionary', async () => {
  const files = [
    ...(await sourceFiles('app')),
    ...(await sourceFiles('components')),
    ...(await sourceFiles('lib')),
  ];
  for (const file of files) {
    const source = await read(file);
    assert.doesNotMatch(source, /\/alerts\/analytics/, file);
    assert.doesNotMatch(source, /\/dictionary/, file);
  }
  // The only report call is gated before it is made.
  const reports = await read('app/analytics.tsx');
  assert.match(reports, /if \(!allowed\) \{\s+setLoading\(false\);\s+return;\s+\}/);
  assert.match(reports, /const allowed = canViewReports\(user\)/);
});

test('change password screen calls the backend, refreshes /auth/me and opens alerts', async () => {
  const screen = await read('app/change-password.tsx');
  const api = await read('lib/api.ts');
  assert.match(api, /client\.post<unknown>\('\/auth\/change-password'/);
  assert.match(api, /current_password: currentPassword/);
  assert.match(screen, /completePasswordChange\(/);
  assert.match(screen, /\{ changePassword, fetchMe, getStatus: getHttpStatus \}/);
  assert.match(screen, /onUserUpdated\(result\.user\);\s+router\.replace\('\/alerts'\)/);
  assert.match(screen, /secure/);
});

test('profile offers change password and shows the server', async () => {
  const profile = await read('app/profile.tsx');
  assert.match(profile, /label="Change password"/);
  assert.match(profile, /router\.push\('\/change-password'\)/);
  assert.match(profile, /describeServer\(serverUrl\)/);
});

test('every API call and push registration uses the selected server', async () => {
  const api = await read('lib/api.ts');
  const auth = await read('lib/auth.ts');
  const notifications = await read('lib/notifications.ts');
  assert.match(api, /config\.baseURL = serverUrl/);
  assert.match(api, /if \(!isAllowedServerUrl\(serverUrl\)\)/);
  assert.doesNotMatch(api, /baseURL: API_BASE_URL/);
  assert.doesNotMatch(auth, /API_BASE_URL/);
  assert.match(auth, /\$\{getServerUrl\(\)\}\/auth\/login/);
  assert.match(auth, /\$\{getServerUrl\(\)\}\/auth\/me/);
  assert.match(notifications, /const serverUrl = getServerUrl\(\)/);
  // The saved server loads before the session is restored.
  const layout = await read('app/_layout.tsx');
  assert.match(layout, /loadSavedServer\(\)\s+\.then\(\(\) =>\s+Promise\.all\(\[restoreSession\(\)/);
});

test('the server option is only on the login screen of demo and development builds', async () => {
  const login = await read('app/login.tsx');
  const constants = await read('lib/constants.ts');
  assert.match(login, /\{SERVER_SWITCHING_ENABLED \? \(\s+<ServerOption/);
  assert.match(login, /switchServer\(/);
  assert.match(login, /checkHealth: checkServerHealth/);
  assert.match(
    constants,
    /SERVER_SWITCHING_ENABLED =\s+APP_ENVIRONMENT === 'demo' \|\| APP_ENVIRONMENT === 'development'/
  );
});

test('alert detail shows the web review actions and super admins see the school', async () => {
  const details = await read('app/alert/[id].tsx');
  const card = await read('components/AlertCard.tsx');
  const list = await read('app/alerts.tsx');
  assert.match(details, /getReviewActions\(alert\.status\)/);
  assert.match(details, /await reviewAlert\(alert\.id, status\)/);
  assert.match(details, /showsSchoolOnAlerts\(user\)/);
  assert.match(card, /alert\.school_name/);
  assert.match(list, /showSchool=\{showSchool\}/);
  assert.match(list, /fetchAlerts\(tab\)/);
  assert.match(list, /label: 'Needs review'/);
  assert.match(list, /label: 'All'/);
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
  assert.match(details, /canViewTechnicalDetails\(user\)/);
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
  assert.match(details, /Test alert, not a real incident/);
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
  const source = await read('app/alerts.tsx');
  assert.match(source, /Loading classroom alerts/);
  assert.match(source, /Nothing needs review\./);
  assert.match(source, /No alerts yet\./);
  assert.match(source, /We couldn’t load classroom alerts/);
  assert.match(source, /OfflineBanner/);
  assert.match(source, /actionLabel="Try again"/);
});

test('user-facing labels are sentence case, not all caps', async () => {
  const files = [...(await sourceFiles('app')), ...(await sourceFiles('components'))];
  for (const file of files) {
    const source = await read(file);
    // Quoted JSX text or string literals made only of capital words.
    assert.doesNotMatch(source, />\s*[A-Z]{3,}(?: [A-Z]{2,})+\s*</, file);
    assert.doesNotMatch(source, /'(?:HIGH|MEDIUM|LOW)(?: PRIORITY)?'/, file);
    assert.doesNotMatch(source, /textTransform: 'uppercase'/, file);
  }
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

test('the axios interceptor and restoreSession use the tested session policy', async () => {
  const api = await read('lib/api.ts');
  const auth = await read('lib/auth.ts');
  assert.match(api, /classifyAuthFailure\(\s+error\.response\?\.status,\s+error\.response\?\.data\?\.detail\s+\)/);
  assert.match(api, /await handleAuthFailure\(failure, failedToken, \{/);
  assert.match(api, /clearLocalPushRegistration,\s+onPasswordChangeRequired: notifyPasswordChangeRequired/);
  assert.match(auth, /return restoreSessionWith\(\{/);
  assert.match(auth, /clearLocalPushRegistration,\s+\}\);/);
  assert.match(auth, /const session = parseLoginResponse\(data\)/);
  assert.match(auth, /await storeUser\(session\.user\)/);
});

test('login shows the deactivated-school message for 403 school_inactive', async () => {
  const login = await read('app/login.tsx');
  assert.match(login, /failure === 'school-inactive'\s+\? SCHOOL_INACTIVE_MESSAGE/);
  assert.match(login, /signOutReason === 'school_inactive'/);
});

test('sign-out survives a backend that refuses the push detach with 401 or 403', async () => {
  const notifications = await read('lib/notifications.ts');
  assert.match(notifications, /if \(status !== 401 && status !== 403\) throw caught;/);
  assert.match(notifications, /setLocalPushCleaner\(clearLocalPushRegistration\)/);
});
