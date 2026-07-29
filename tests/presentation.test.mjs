import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAlertNotificationCopy,
  canViewReports,
  canViewTechnicalDetails,
  formatDateTime,
  getAlertExplanation,
  getPriorityLabel,
  getRoleLabel,
  humanizeStatus,
  isToday,
  isWithinDays,
  normalizeSeverity,
  sortAlertsNewestFirst,
} from '../lib/presentation.ts';
import { COLORS } from '../lib/constants.ts';

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

test('priority labels include readable text and normalize unknown values safely', () => {
  assert.equal(getPriorityLabel('high'), 'HIGH PRIORITY');
  assert.equal(getPriorityLabel('medium'), 'MEDIUM PRIORITY');
  assert.equal(getPriorityLabel('low'), 'LOW PRIORITY');
  assert.equal(normalizeSeverity('unexpected'), 'low');
});

test('teacher-facing explanations avoid definitive claims', () => {
  for (const priority of ['high', 'medium', 'low']) {
    const explanation = getAlertExplanation(priority);
    assert.match(explanation, /may|possible/i);
    assert.doesNotMatch(explanation, /confirmed|student is bullying|bullying detected/i);
  }
});

test('notification copy is calm and excludes transcript content', () => {
  const copy = buildAlertNotificationCopy(alert);
  assert.equal(copy.title, 'Possible aggression alert');
  assert.equal(
    copy.body,
    'Unverified possible-aggression alert. Human review required.'
  );
  assert.doesNotMatch(copy.body, /Sensitive phrase/);
  assert.doesNotMatch(copy.body, /aggression detected|bullying/i);
});

test('existing backend roles map to role-appropriate presentation', () => {
  assert.equal(getRoleLabel('staff'), 'Teacher');
  assert.equal(getRoleLabel('counselor'), 'Guidance counselor');
  assert.equal(getRoleLabel('admin'), 'Administrator');
  assert.equal(canViewReports('staff'), false);
  assert.equal(canViewReports('counselor'), true);
  assert.equal(canViewReports('admin'), true);
  assert.equal(canViewTechnicalDetails('staff'), false);
  assert.equal(canViewTechnicalDetails('counselor'), false);
  assert.equal(canViewTechnicalDetails('admin'), true);
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
  assert.equal(humanizeStatus('new_alert'), 'New Alert');
  assert.equal(humanizeStatus(''), 'Available');
});

function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function luminance(hex) {
  const components = hexToRgb(hex).map((component) => {
    const value = component / 255;
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (
    0.2126 * components[0] +
    0.7152 * components[1] +
    0.0722 * components[2]
  );
}

function contrast(left, right) {
  const lighter = Math.max(luminance(left), luminance(right));
  const darker = Math.min(luminance(left), luminance(right));
  return (lighter + 0.05) / (darker + 0.05);
}

test('core theme text and primary button colors meet readable contrast', () => {
  assert.ok(contrast(COLORS.text, COLORS.background) >= 4.5);
  assert.ok(contrast(COLORS.textSecondary, COLORS.surface) >= 4.5);
  assert.ok(contrast(COLORS.white, COLORS.primary) >= 4.5);
});
