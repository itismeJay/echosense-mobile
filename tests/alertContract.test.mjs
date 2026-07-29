import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AlertContractError,
  normalizeAlertSeverity,
  parseAlertListResponse,
  parseAlertResponse,
  parseSeverityEvidence,
} from '../lib/alertContract.ts';

function rawAlert(overrides = {}) {
  return {
    id: 42,
    event_id: '123e4567-e89b-42d3-a456-426614174000',
    severity: 'MEDIUM',
    severity_level: 'MEDIUM',
    severity_evidence: null,
    review_notice:
      'Unverified possible-aggression alert. Human review required.',
    confidence: 0.84,
    duration: 1.4,
    location: 'Synthetic Room',
    status: 'active',
    created_at: '2026-07-28T02:42:00.000Z',
    language: 'mixed',
    matched_terms: [],
    ...overrides,
  };
}

test('canonical and lowercase severities normalize without changing meaning', () => {
  for (const value of ['LOW', 'low']) {
    assert.equal(normalizeAlertSeverity(value), 'low');
  }
  for (const value of ['MEDIUM', 'medium']) {
    assert.equal(normalizeAlertSeverity(value), 'medium');
  }
  for (const value of ['HIGH', 'high']) {
    assert.equal(normalizeAlertSeverity(value), 'high');
  }
});

test('invalid severity remains unknown and is never converted to low', () => {
  assert.equal(normalizeAlertSeverity('unexpected'), 'unknown');
  assert.equal(normalizeAlertSeverity(null), 'unknown');
  assert.equal(
    parseAlertResponse(rawAlert({ severity: 'unexpected', severity_level: null }))
      .severity,
    'unknown'
  );
});

test('complete severity evidence is parsed without fabricating fields', () => {
  const result = parseAlertResponse(
    rawAlert({
      severity: 'HIGH',
      severity_level: 'HIGH',
      severity_evidence: {
        level: 'HIGH',
        reasons: ['term_category:self_harm_directive'],
        term_categories: {
          self_harm_directive: ['matched phrase'],
        },
        supporting_evidence: [
          'laughter_or_excitement_marker_present',
        ],
      },
    })
  );
  assert.equal(result.severity, 'high');
  assert.equal(result.severity_evidence_state, 'available');
  assert.deepEqual(result.severity_evidence, {
    level: 'HIGH',
    reasons: ['term_category:self_harm_directive'],
    term_categories: {
      self_harm_directive: ['matched phrase'],
    },
    supporting_evidence: [
      'laughter_or_excitement_marker_present',
    ],
  });
});

test('null, omitted, empty, and malformed evidence remain distinguishable', () => {
  assert.equal(
    parseAlertResponse(rawAlert({ severity_evidence: null }))
      .severity_evidence_state,
    'historical-unavailable'
  );
  const omitted = rawAlert();
  delete omitted.severity_evidence;
  assert.equal(
    parseAlertResponse(omitted).severity_evidence_state,
    'not-provided'
  );
  assert.equal(
    parseAlertResponse(
      rawAlert({
        severity_evidence: { level: 'LOW', reasons: [] },
      })
    ).severity_evidence_state,
    'empty'
  );
  assert.equal(
    parseAlertResponse(
      rawAlert({
        severity_evidence: { level: 'HIGH', reasons: null },
      })
    ).severity_evidence_state,
    'malformed'
  );
});

test('exact transcript content and compatibility alias are preserved', () => {
  const transcript = '  Exact stored transcript.\nSecond line.  ';
  const parsed = parseAlertResponse(
    rawAlert({ transcribed_text: transcript, transcript })
  );
  assert.equal(parsed.transcribed_text, transcript);
  assert.equal(parsed.transcript, transcript);
});

test('optional language confidence, categories, YAMNet, and tone parse safely', () => {
  const parsed = parseAlertResponse(
    rawAlert({
      language_confidence: 0.77,
      categories: ['synthetic_category'],
      yamnet_ran: false,
      yamnet_class: 'Synthetic class',
      yamnet_score: 0.25,
      tone: 'synthetic tone',
    })
  );
  assert.equal(parsed.language_confidence, 0.77);
  assert.deepEqual(parsed.categories, ['synthetic_category']);
  assert.equal(parsed.yamnet_ran, false);
  assert.equal(parsed.yamnet_class, 'Synthetic class');
  assert.equal(parsed.yamnet_score, 0.25);
  assert.equal(parsed.tone, 'synthetic tone');
});

test('unknown optional fields and raw audio fields are not copied into Alert', () => {
  const parsed = parseAlertResponse(
    rawAlert({
      future_optional_field: { value: true },
      raw_audio: 'synthetic-audio-that-must-not-be-processed',
    })
  );
  assert.equal('future_optional_field' in parsed, false);
  assert.equal('raw_audio' in parsed, false);
});

test('invalid required response shapes fail without exposing payload data', () => {
  assert.throws(
    () => parseAlertListResponse({ not: 'an array' }),
    AlertContractError
  );
  assert.throws(
    () =>
      parseAlertResponse(
        rawAlert({ id: 0, transcribed_text: 'sensitive synthetic text' })
      ),
    (caught) => {
      assert.equal(caught instanceof AlertContractError, true);
      assert.doesNotMatch(caught.message, /sensitive synthetic text/);
      return true;
    }
  );
});

test('severity evidence parser uses a safe malformed state', () => {
  assert.deepEqual(parseSeverityEvidence('not-an-object'), {
    evidence: undefined,
    state: 'malformed',
  });
});
