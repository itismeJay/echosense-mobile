import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
  PRODUCTION_API_BASE_URL,
  resolveApiBaseUrl,
} from '../lib/apiConfig.ts';

const root = path.resolve(import.meta.dirname, '..');

test('API URL uses a safe HTTPS production fallback', () => {
  assert.match(PRODUCTION_API_BASE_URL, /^https:\/\//);
  assert.equal(resolveApiBaseUrl(undefined), PRODUCTION_API_BASE_URL);
});

test('configured API URL trims whitespace and trailing slashes', () => {
  assert.equal(
    resolveApiBaseUrl('  http://192.168.1.92:8000///  '),
    'http://192.168.1.92:8000'
  );
});

test('empty and unsafe API origins are rejected', () => {
  for (const value of [
    '',
    '   ',
    'ftp://example.com',
    'https://user:pass@example.com',
    'https://example.com/api',
    'https://example.com?token=secret',
  ]) {
    assert.throws(() => resolveApiBaseUrl(value));
  }
});

test('EAS profiles separate LAN development from HTTPS preview/production', async () => {
  const eas = JSON.parse(await readFile(path.join(root, 'eas.json'), 'utf8'));
  assert.equal(
    eas.build.development.env.EXPO_PUBLIC_API_BASE_URL,
    'http://192.168.1.92:8000'
  );
  assert.match(eas.build.preview.env.EXPO_PUBLIC_API_BASE_URL, /^https:\/\//);
  assert.equal(
    eas.build['lan-preview'].env.EXPO_PUBLIC_API_BASE_URL,
    PRODUCTION_API_BASE_URL
  );
  assert.equal(eas.build['lan-preview'].env.EXPO_PUBLIC_APP_ENV, 'preview');
  assert.equal(eas.build['lan-preview'].android.buildType, 'apk');
  assert.match(
    eas.build.production.env.EXPO_PUBLIC_API_BASE_URL,
    /^https:\/\//
  );
});

test('native LAN exceptions are development-scoped and never allow arbitrary iOS loads', async () => {
  const config = await readFile(path.join(root, 'app.config.ts'), 'utf8');
  assert.match(config, /usesCleartextTraffic:\s*usesLanHttp/);
  assert.match(config, /NSAllowsLocalNetworking: true/);
  assert.doesNotMatch(config, /NSAllowsArbitraryLoads/);
});
