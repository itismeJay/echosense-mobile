import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EVIDENCE_REVIEW_NOTE,
  getExactTranscript,
  getLanguageLabel,
  getMatchedTermLabels,
  getYamnetExplanation,
  HUMAN_REVIEW_WORDING,
} from '../lib/alertEvidence.ts';

function alert(overrides = {}) {
  return {
    id: 42,
    severity: 'medium',
    confidence: 0.84,
    duration: 1.4,
    location: 'Synthetic Room',
    status: 'new',
    created_at: '2026-07-28T02:42:00.000Z',
    ...overrides,
  };
}

for (const [language, transcript] of [
  ['fil', 'Hoy, Kumusta Ka? Huwag NIYO akong sigawan!'],
  ['ceb', "Ayaw Ko'g Ingna Ana—Palihog!"],
  ['mixed', 'Please, huwag mo akong SIGAWAN; palihog.'],
]) {
  test(`${language} transcript is returned exactly`, () => {
    assert.equal(
      getExactTranscript(alert({ language, transcribed_text: transcript })),
      transcript
    );
  });
}

test('transcript whitespace is preserved exactly and missing values fall back', () => {
  const exact = '  Exact stored transcript.\nSecond line.  ';
  assert.equal(getExactTranscript(alert({ transcribed_text: exact })), exact);
  for (const transcribed_text of [null, undefined, '', '   \t']) {
    assert.equal(getExactTranscript(alert({ transcribed_text })), null);
  }
});
test('all backend language values render safely', () => {
  assert.equal(getLanguageLabel('fil'), 'Filipino (fil)');
  assert.equal(getLanguageLabel('ceb'), 'Cebuano (ceb)');
  assert.equal(getLanguageLabel('en'), 'English (en)');
  assert.equal(getLanguageLabel('mixed'), 'Mixed language');
  assert.equal(getLanguageLabel('unknown'), 'Language unavailable');
  assert.equal(getLanguageLabel(null), 'Language unavailable');
});

test('matched terms render in stored order and empty legacy values are safe', () => {
  const matched_terms = [
    { term_id: 1, term: 'synthetic-one', language: 'fil', match_type: 'exact' },
    { term_id: 2, term: 'synthetic-two', language: 'ceb', match_type: 'exact' },
  ];
  assert.deepEqual(
    getMatchedTermLabels(alert({ matched_terms })),
    ['synthetic-one', 'synthetic-two']
  );
  assert.deepEqual(getMatchedTermLabels(alert({ matched_terms: null })), []);
});

test('yamnet_ran true, false, and legacy null are explained without claims', () => {
  const ran = getYamnetExplanation(true);
  const skipped = getYamnetExplanation(false);
  const legacy = getYamnetExplanation(null);
  assert.match(ran, /ran.*automated indicator/i);
  assert.match(skipped, /did not run/i);
  assert.match(legacy, /unavailable.*legacy/i);
  for (const wording of [ran, skipped, legacy]) {
    assert.doesNotMatch(wording, /confirmed bullying|establishes guilt/i);
  }
});

test('required human-review wording and supporting note are exact', () => {
  assert.equal(
    HUMAN_REVIEW_WORDING,
    'Unverified possible-aggression alert. Human review required.'
  );
  assert.equal(
    EVIDENCE_REVIEW_NOTE,
    'The transcript and acoustic evidence are automated indicators. Review the surrounding context before taking action.'
  );
});
