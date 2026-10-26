import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAlertNotificationCopy,
  formatDateTime,
  getAlertExplanation,
  getPriorityLabel,
  humanizeStatus,
  isToday,
  isWithinDays,
  normalizeSeverity,
  sortAlertsNewestFirst,
} from '../lib/presentation.ts';
import { DARK, LIGHT, contrastRatio } from '../lib/theme.ts';

const alert = {
  id: 42,
  severity: 'high',
  confidence: 0.91,
  duration: 2.4,
  location: 'Grade 6 – Section A',
  status: 'new_alert',
  created_at: '2026-07-28T02:42:00.000Z',
  transcribed_text: 'Sensitive phrase that must not be on a lock screen',
};

test('priority labels include readable text and preserve invalid values safely', () => {
  assert.equal(getPriorityLabel('high'), 'High');
  assert.equal(getPriorityLabel('medium'), 'Medium');
  assert.equal(getPriorityLabel('low'), 'Low');
  assert.equal(normalizeSeverity('unexpected'), 'unknown');
  assert.equal(getPriorityLabel('unexpected'), 'Severity unavailable');
});

test('teacher-facing explanations avoid definitive claims', () => {
  for (const priority of ['high', 'medium', 'low']) {
    const explanation = getAlertExplanation(priority);
    assert.match(explanation, /may|possible/i);
    assert.doesNotMatch(explanation, /confirmed|student is bullying|bullying detected/i);
  }
});

test('HIGH notification copy is distinct and excludes transcript content', () => {
  const copy = buildAlertNotificationCopy(alert);
  assert.equal(copy.title, 'High-priority classroom alert');
  assert.equal(
    copy.body,
    'Strong possible-aggression indicators were detected. Prompt human review is recommended.'
  );
  assert.doesNotMatch(copy.body, /Sensitive phrase/);
  assert.doesNotMatch(copy.body, /bullying/i);
});

test('LOW and MEDIUM notification templates remain distinct', () => {
  assert.deepEqual(buildAlertNotificationCopy({ ...alert, severity: 'low' }), {
    title: 'Possible classroom concern',
    body: 'A low-severity unverified alert requires staff review.',
  });
  assert.deepEqual(
    buildAlertNotificationCopy({ ...alert, severity: 'medium' }),
    {
      title: 'Possible verbal-aggression indicators',
      body: 'A medium-severity unverified alert requires staff review.',
    }
  );
});

test('timestamps and date filters handle valid and invalid values', () => {
  const now = new Date('2026-07-28T12:00:00.000Z');
  assert.equal(isToday('2026-07-28T02:42:00.000Z', now), true);
  assert.equal(isWithinDays('2026-07-23T12:00:00.000Z', 7, now), true);
  assert.equal(isToday('not-a-date', now), false);
  assert.equal(formatDateTime('not-a-date'), 'Date and time unavailable');
});

test('alerts are sorted newest first without mutating input', () => {
  const older = { ...alert, id: 1, created_at: '2026-07-27T10:00:00.000Z' };
  const newer = { ...alert, id: 2, created_at: '2026-07-28T10:00:00.000Z' };
  const input = [older, newer];
  assert.deepEqual(sortAlertsNewestFirst(input).map((item) => item.id), [2, 1]);
  assert.deepEqual(input.map((item) => item.id), [1, 2]);
});

test('backend statuses are displayed as plain language', () => {
  assert.equal(humanizeStatus('new_alert'), 'New alert');
  assert.equal(humanizeStatus(''), 'Available');
});

test('labels are sentence case, never all caps', () => {
  for (const value of ['high', 'medium', 'low', 'other']) {
    const label = getPriorityLabel(value);
    assert.notEqual(label, label.toUpperCase());
  }
  assert.equal(humanizeStatus('NEEDS_REVIEW'), 'Needs review');
});

for (const [name, palette] of [
  ['light', LIGHT],
  ['dark', DARK],
]) {
  test(`${name} theme text, links and buttons meet WCAG AA`, () => {
    assert.ok(contrastRatio(palette.text, palette.background) >= 4.5);
    assert.ok(contrastRatio(palette.text, palette.surface) >= 4.5);
    assert.ok(contrastRatio(palette.textMuted, palette.surface) >= 4.5);
    assert.ok(contrastRatio(palette.textMuted, palette.background) >= 4.5);
    assert.ok(contrastRatio(palette.link, palette.surface) >= 4.5);
    assert.ok(contrastRatio(palette.onBrand, palette.brand) >= 4.5);
    assert.ok(contrastRatio(palette.danger, palette.dangerBackground) >= 4.5);
    assert.ok(contrastRatio(palette.lineStrong, palette.surface) >= 3);
  });

  test(`${name} theme severity text is readable on its tag`, () => {
    for (const severity of ['high', 'medium', 'low']) {
      assert.ok(
        contrastRatio(palette[severity], palette[`${severity}Background`]) >= 4.5,
        severity
      );
      assert.ok(contrastRatio(palette[severity], palette.surface) >= 4.5, severity);
    }
  });
}

test('theme uses the specified brand and dark-mode values', () => {
  assert.equal(LIGHT.brand, '#3ECF8E');
  assert.equal(LIGHT.onBrand, '#0B2A1C');
  assert.equal(LIGHT.link, '#1A7F52');
  assert.equal(LIGHT.surface, '#FFFFFF');
  assert.equal(DARK.background, '#000000');
  assert.equal(DARK.surface, '#141414');
  assert.equal(DARK.line, '#262626');
  // Green never carries severity.
  for (const palette of [LIGHT, DARK]) {
    for (const severity of ['high', 'medium', 'low']) {
      assert.notEqual(palette[severity], palette.brand);
    }
  }
});
