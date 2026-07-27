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

test('push tokens and notification payloads are not printed', async () => {
  const login = await read('app/login.tsx');
  const notifications = await read('lib/notifications.ts');
  const source = `${login}\n${notifications}`;
  assert.doesNotMatch(source, /console\.(?:log|info|warn|error)\([^)]*(?:pushToken|data|PROJECT_ID)/);
  assert.doesNotMatch(source, /token received|push token:/i);
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
