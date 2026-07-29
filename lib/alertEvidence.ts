import type { Alert } from './types';

export const HUMAN_REVIEW_WORDING =
  'Unverified possible-aggression alert. Human review required.';

export const EVIDENCE_REVIEW_NOTE =
  'The transcript and acoustic evidence are automated indicators. Review the surrounding context before taking action.';

export function getExactTranscript(alert: Alert): string | null {
  return typeof alert.transcribed_text === 'string' &&
    alert.transcribed_text.trim().length > 0
    ? alert.transcribed_text
    : null;
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
    case '':
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
