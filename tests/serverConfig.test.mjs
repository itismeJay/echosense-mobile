import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
  LIVE_SERVER_URL,
  describeServer,
  isAllowedServerUrl,
  isHealthyResponse,
  isPrivateLanHost,
  parseServerAddress,
  switchServer,
} from '../lib/serverConfig.ts';

const root = path.resolve(import.meta.dirname, '..');
const LOCAL = 'http://192.168.1.81:8000';

test('only private LAN IPv4 ranges count as local', () => {
  for (const host of [
    '192.168.0.1',
    '192.168.1.81',
    '10.0.0.5',
    '10.255.255.255',
    '172.16.0.1',
    '172.31.255.254',
  ]) {
    assert.equal(isPrivateLanHost(host), true, host);
  }
  for (const host of [
    '172.15.0.1',
    '172.32.0.1',
    '192.169.1.1',
    '8.8.8.8',
    '127.0.0.1',
    '192.168.1.256',
    'localhost',
    'example.com',
    '192.168.1',
  ]) {
    assert.equal(isPrivateLanHost(host), false, host);
  }
});

test('a bare LAN address gets http:// and keeps its port', () => {
  assert.deepEqual(parseServerAddress('192.168.1.81:8000'), {
    ok: true,
    url: LOCAL,
  });
  assert.deepEqual(parseServerAddress('  http://192.168.1.81:8000/  '), {
    ok: true,
    url: LOCAL,
  });
  assert.deepEqual(parseServerAddress('http://10.0.2.2:8000'), {
    ok: true,
    url: 'http://10.0.2.2:8000',
  });
});

test('the live server is always accepted', () => {
  assert.deepEqual(parseServerAddress(LIVE_SERVER_URL), {
    ok: true,
    url: LIVE_SERVER_URL,
  });
  assert.deepEqual(parseServerAddress(`${LIVE_SERVER_URL}/`), {
    ok: true,
    url: LIVE_SERVER_URL,
  });
});

test('public, malformed and unsafe addresses are rejected with a message', () => {
  for (const value of [
    '',
    '   ',
    'http://8.8.8.8:8000',
    'http://example.com',
    'https://example.com',
    'http://localhost:8000',
    'ftp://192.168.1.81',
    'http://192.168.1.81:8000/api',
    'http://192.168.1.81:8000?x=1',
    'http://user:pass@192.168.1.81:8000',
    'http://192.168.1.81:99999',
    'http://172.32.0.1:8000',
    'not a url',
  ]) {
    const result = parseServerAddress(value);
    assert.equal(result.ok, false, value);
    assert.ok(result.error.length > 0, value);
  }
});

test('plain HTTP is only allowed to LAN hosts at request time', () => {
  assert.equal(isAllowedServerUrl(LOCAL), true);
  assert.equal(isAllowedServerUrl(LIVE_SERVER_URL), true);
  assert.equal(isAllowedServerUrl('http://8.8.8.8:8000'), false);
  assert.equal(isAllowedServerUrl('http://example.com'), false);
  assert.equal(isAllowedServerUrl('garbage'), false);
});

test('servers are described in plain words', () => {
  assert.equal(describeServer(LIVE_SERVER_URL), 'Live (Render)');
  assert.equal(describeServer(LOCAL), 'Local (192.168.1.81:8000)');
});

test('/health must answer 200 with status ok', () => {
  assert.equal(isHealthyResponse(200, { status: 'ok' }), true);
  assert.equal(isHealthyResponse(200, { status: 'down' }), false);
  assert.equal(isHealthyResponse(200, '<html>'), false);
  assert.equal(isHealthyResponse(503, { status: 'ok' }), false);
});

function switchDependencies(overrides = {}) {
  const calls = [];
  const values = {
    currentUrl: LIVE_SERVER_URL,
    checkHealth: async (url) => {
      calls.push(['health', url]);
      return true;
    },
    hasSession: async () => true,
    detachPushToken: async () => calls.push(['detach']),
    clearLocalPushRegistration: async () => calls.push(['clear-local-push']),
    signOut: async () => calls.push(['sign-out']),
    saveServer: async (url) => calls.push(['save', url]),
    ...overrides,
  };
  return { calls, values };
}

test('switching checks /health first, then detaches push, signs out and saves', async () => {
  const { calls, values } = switchDependencies();
  const result = await switchServer('192.168.1.81:8000', values);
  assert.deepEqual(result, { status: 'switched', url: LOCAL, signedOut: true });
  assert.deepEqual(calls, [
    ['health', LOCAL],
    ['detach'],
    ['clear-local-push'],
    ['sign-out'],
    ['save', LOCAL],
  ]);
});

test('an unreachable server changes nothing and keeps the session', async () => {
  for (const checkHealth of [async () => false, async () => { throw new Error('timeout'); }]) {
    const { calls, values } = switchDependencies({ checkHealth });
    const result = await switchServer(LOCAL, values);
    assert.deepEqual(result, { status: 'unreachable' });
    assert.deepEqual(calls, []);
  }
});

test('an invalid address is rejected before any network call', async () => {
  const { calls, values } = switchDependencies();
  const result = await switchServer('http://8.8.8.8:8000', values);
  assert.equal(result.status, 'invalid');
  assert.deepEqual(calls, []);
});

test('choosing the current server again does nothing', async () => {
  const { calls, values } = switchDependencies({ currentUrl: LOCAL });
  assert.deepEqual(await switchServer(`${LOCAL}/`, values), { status: 'unchanged' });
  assert.deepEqual(calls, []);
});

test('without a session the stored push registration is still cleared so it re-registers', async () => {
  const { calls, values } = switchDependencies({ hasSession: async () => false });
  const result = await switchServer(LOCAL, values);
  assert.deepEqual(result, { status: 'switched', url: LOCAL, signedOut: false });
  assert.deepEqual(calls, [
    ['health', LOCAL],
    ['clear-local-push'],
    ['save', LOCAL],
  ]);
});

test('an offline old server cannot block the switch or the push reset', async () => {
  const { calls, values } = switchDependencies({
    currentUrl: LOCAL,
    detachPushToken: async () => {
      throw new Error('old server offline');
    },
  });
  const result = await switchServer(LIVE_SERVER_URL, values);
  assert.equal(result.status, 'switched');
  assert.deepEqual(calls.map(([name]) => name), [
    'health',
    'clear-local-push',
    'sign-out',
    'save',
  ]);
});

test('demo EAS profile is an APK that starts on the live server', async () => {
  const eas = JSON.parse(await readFile(path.join(root, 'eas.json'), 'utf8'));
  const demo = eas.build.demo;
  assert.equal(demo.android.buildType, 'apk');
  assert.equal(demo.distribution, 'internal');
  assert.equal(demo.env.EXPO_PUBLIC_APP_ENV, 'demo');
  assert.equal(demo.env.EXPO_PUBLIC_API_BASE_URL, LIVE_SERVER_URL);
});

test('preview and production profiles are unchanged and HTTPS only', async () => {
  const eas = JSON.parse(await readFile(path.join(root, 'eas.json'), 'utf8'));
  assert.deepEqual(eas.build.preview, {
    distribution: 'internal',
    env: {
      EXPO_PUBLIC_APP_ENV: 'preview',
      EXPO_PUBLIC_API_BASE_URL: LIVE_SERVER_URL,
    },
  });
  assert.deepEqual(eas.build.production, {
    autoIncrement: true,
    env: {
      EXPO_PUBLIC_APP_ENV: 'production',
      EXPO_PUBLIC_API_BASE_URL: LIVE_SERVER_URL,
    },
  });
});

test('cleartext is allowed for demo and LAN development builds only', async () => {
  const config = await readFile(path.join(root, 'app.config.ts'), 'utf8');
  assert.match(config, /const isDemo = appEnvironment === 'demo';/);
  assert.match(
    config,
    /const usesLanHttp =\s+\(isDevelopment && apiBaseUrl\.startsWith\('http:\/\/'\)\) \|\| isDemo;/
  );
  assert.match(config, /usesCleartextTraffic: usesLanHttp/);
  assert.match(config, /if \(!isDevelopment && !apiBaseUrl\.startsWith\('https:\/\/'\)\)/);
  assert.doesNotMatch(config, /NSAllowsArbitraryLoads/);
});

test('localhost is refused by default and allowed only with the simulator rule', () => {
  for (const value of ['http://localhost:8000', 'localhost:8000', 'http://127.0.0.1:8000']) {
    assert.equal(parseServerAddress(value).ok, false, value);
    assert.equal(parseServerAddress(value, { allowLoopback: false }).ok, false, value);
  }
  assert.deepEqual(parseServerAddress('localhost:8000', { allowLoopback: true }), {
    ok: true,
    url: 'http://localhost:8000',
  });
  assert.deepEqual(parseServerAddress('http://127.0.0.1:8000/', { allowLoopback: true }), {
    ok: true,
    url: 'http://127.0.0.1:8000',
  });
  // The rule never opens public hosts or other loopback-looking names.
  assert.equal(parseServerAddress('http://8.8.8.8', { allowLoopback: true }).ok, false);
  assert.equal(parseServerAddress('http://localhost.evil.com', { allowLoopback: true }).ok, false);
  assert.equal(parseServerAddress('http://127.0.0.2:8000', { allowLoopback: true }).ok, false);
});

test('the request guard follows the same loopback rule', () => {
  assert.equal(isAllowedServerUrl('http://localhost:8000'), false);
  assert.equal(isAllowedServerUrl('http://localhost:8000', { allowLoopback: true }), true);
  assert.equal(isAllowedServerUrl('http://example.com', { allowLoopback: true }), false);
});

test('switching to localhost uses the rules it is given', async () => {
  const refused = switchDependencies();
  assert.equal((await switchServer('http://localhost:8000', refused.values)).status, 'invalid');
  assert.deepEqual(refused.calls, []);
  const allowed = switchDependencies({ rules: { allowLoopback: true } });
  assert.deepEqual(await switchServer('http://localhost:8000', allowed.values), {
    status: 'switched',
    url: 'http://localhost:8000',
    signedOut: true,
  });
});

test('the loopback rule is limited to development builds on the iOS Simulator', async () => {
  const server = await readFile(path.join(root, 'lib/server.ts'), 'utf8');
  assert.match(
    server,
    /allowLoopback:\s+APP_ENVIRONMENT === 'development' &&\s+Platform\.OS === 'ios' &&\s+!Device\.isDevice/
  );
});
