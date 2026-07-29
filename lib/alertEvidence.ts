import type { Alert } from './types';

export const HUMAN_REVIEW_WORDING =
  'Unverified possible-aggression alert. Human review required.';

export const EVIDENCE_REVIEW_NOTE =
  'The transcript and acoustic evidence are automated indicators. Review the surrounding context before taking action.';

export const HISTORICAL_SEVERITY_EVIDENCE_MESSAGE =
  'Detailed severity evidence was not recorded for this historical alert.';

export const EMPTY_SEVERITY_EVIDENCE_MESSAGE =
  'Severity evidence was recorded, but no detailed reasons were included.';

export const MALFORMED_SEVERITY_EVIDENCE_MESSAGE =
  'Detailed severity evidence could not be displayed because its recorded format was invalid.';

export const UNAVAILABLE_SEVERITY_EVIDENCE_MESSAGE =
  'Detailed severity evidence is unavailable for this alert.';

export function getExactTranscript(alert: Alert): string | null {
  const transcript =
    typeof alert.transcript === 'string'
      ? alert.transcript
      : alert.transcribed_text;
  return typeof transcript === 'string' && transcript.trim().length > 0
    ? transcript
    : null;
}

export function getReviewNotice(alert: Alert): string {
  return typeof alert.review_notice === 'string' &&
    alert.review_notice.trim().length > 0
    ? alert.review_notice
    : HUMAN_REVIEW_WORDING;
}

export function getLanguageLabel(
  language: Alert['language']
): string {
  switch (language) {
    case 'fil':
      return 'Filipino (fil)';
    case 'ceb':
      return 'Cebuano (ceb)';
    case 'en':
      return 'English (en)';
    case 'mixed':
      return 'Mixed language';
    case 'unknown':
    case null:
    case undefined:
      return 'Language unavailable';
    default:
      return language;
  }
}

export function getMatchedTermLabels(alert: Alert): string[] {
  if (!Array.isArray(alert.matched_terms)) return [];
  return alert.matched_terms
    .map((match) => match?.term)
    .filter((term): term is string => typeof term === 'string' && term.length > 0);
}

export function getYamnetExplanation(
  yamnetRan: Alert['yamnet_ran']
): string {
  if (yamnetRan === true) {
    return 'Acoustic classification ran for this event. It is an automated indicator and does not establish what happened.';
  }
  if (yamnetRan === false) {
    return 'Acoustic classification did not run for this event. Review the transcript and surrounding context.';
  }
  return 'Acoustic classification status is unavailable for this legacy alert.';
}

// These shared-key labels intentionally match echosense-frontend exactly.
const SEVERITY_REASON_LABELS: Record<string, string> = {
  'term_category:self_harm_directive':
    'Severe self-harm directive detected in the transcript',
};

const SUPPORTING_EVIDENCE_LABELS: Record<string, string> = {
  laughter_or_excitement_marker_present:
    'Laughter or excitement was present, but it did not cancel the stronger text evidence',
};

const TERM_CATEGORY_LABELS: Record<string, string> = {
  self_harm_directive: 'Severe self-harm directive',
};

function readableMachineKey(value: string): string {
  const readable = value
    .replace(/:/g, ': ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!readable) return 'Recorded evidence';
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

export function severityReasonLabel(reason: string): string {
  const known = SEVERITY_REASON_LABELS[reason];
  if (known) return known;
  if (reason.startsWith('term_category:')) {
    return `Transcript matched the ${termCategoryEvidenceLabel(
      reason.slice('term_category:'.length)
    ).toLowerCase()} category`;
  }
  return readableMachineKey(reason);
}

export function termCategoryEvidenceLabel(category: string): string {
  return TERM_CATEGORY_LABELS[category] ?? readableMachineKey(category);
}

export function supportingEvidenceLabel(evidence: string): string {
  return (
    SUPPORTING_EVIDENCE_LABELS[evidence] ?? readableMachineKey(evidence)
  );
}

export function getSeverityEvidenceUnavailableMessage(alert: Alert): string {
  switch (alert.severity_evidence_state) {
    case 'historical-unavailable':
      return HISTORICAL_SEVERITY_EVIDENCE_MESSAGE;
    case 'empty':
      return EMPTY_SEVERITY_EVIDENCE_MESSAGE;
    case 'malformed':
      return MALFORMED_SEVERITY_EVIDENCE_MESSAGE;
    default:
      return UNAVAILABLE_SEVERITY_EVIDENCE_MESSAGE;
  }
}
