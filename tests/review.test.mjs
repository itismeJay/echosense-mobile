import assert from 'node:assert/strict';
import test from 'node:test';
import {
  alertListParams,
  buildReviewRequest,
  getReviewActions,
  normalizeReviewStatus,
  reviewConfirmation,
  reviewStatusLabel,
} from '../lib/review.ts';

const actions = (status) =>
  getReviewActions(status).map(({ status: next, label, primary }) => [next, label, primary]);

test('an alert that needs review offers Mark reviewed (primary) and Mark resolved', () => {
  for (const status of ['active', 'unknown', 'new_alert', '', null, undefined]) {
    assert.deepEqual(
      actions(status),
      [
        ['reviewed', 'Mark reviewed', true],
        ['resolved', 'Mark resolved', false],
      ],
      String(status)
    );
  }
});

test('a reviewed alert can be resolved or moved back', () => {
  assert.deepEqual(actions('reviewed'), [
    ['resolved', 'Mark resolved', true],
    ['active', 'Move back to Needs review', false],
  ]);
});

test('a resolved alert can only be moved back', () => {
  assert.deepEqual(actions('Resolved'), [
    ['active', 'Move back to Needs review', false],
  ]);
});

test('statuses read as plain labels', () => {
  assert.equal(reviewStatusLabel('active'), 'Needs review');
  assert.equal(reviewStatusLabel('reviewed'), 'Reviewed');
  assert.equal(reviewStatusLabel('resolved'), 'Resolved');
  assert.equal(normalizeReviewStatus(' REVIEWED '), 'reviewed');
  assert.equal(reviewConfirmation('reviewed'), 'Marked as reviewed.');
  assert.equal(reviewConfirmation('active'), 'Moved back to Needs review.');
});

test('the review request matches POST /alerts/{id}/review', () => {
  assert.deepEqual(buildReviewRequest(11, 'reviewed'), {
    path: '/alerts/11/review',
    body: { status: 'reviewed' },
  });
  assert.deepEqual(buildReviewRequest(11, 'active').body, { status: 'active' });
  for (const id of [0, -1, 1.5, Number.NaN]) {
    assert.throws(() => buildReviewRequest(id, 'reviewed'));
  }
  assert.throws(() => buildReviewRequest(11, 'deleted'));
});

test('list tabs map to the backend status filter', () => {
  assert.deepEqual(alertListParams('needs-review'), { status: 'active' });
  assert.deepEqual(alertListParams('all'), {});
});
