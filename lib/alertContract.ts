import type {
  Alert,
  AlertLanguage,
  AlertSeverity,
  CanonicalSeverity,
  MatchedTerm,
  SeverityEvidence,
  SeverityEvidenceState,
} from './types';

export class AlertContractError extends Error {
  public readonly endpoint: string;

  constructor(endpoint: string, message: string) {
    super(`Invalid response from ${endpoint}: ${message}`);
    this.endpoint = endpoint;
    this.name = 'AlertContractError';
  }
}

const ALERT_LANGUAGES = new Set<AlertLanguage>([
  'fil',
  'ceb',
  'en',
  'mixed',
  'unknown',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function normalizeAlertSeverity(value: unknown): AlertSeverity {
  if (typeof value !== 'string') return 'unknown';
  switch (value.trim().toUpperCase()) {
    case 'HIGH':
      return 'high';
    case 'MEDIUM':
      return 'medium';
    case 'LOW':
      return 'low';
    default:
      return 'unknown';
  }
}

function normalizeCanonicalSeverity(
  value: unknown
): CanonicalSeverity | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toUpperCase();
  return normalized === 'LOW' ||
    normalized === 'MEDIUM' ||
    normalized === 'HIGH'
    ? normalized
    : undefined;
}

function optionalString(
  value: Record<string, unknown>,
  field: string
): string | null | undefined {
  const fieldValue = value[field];
  return typeof fieldValue === 'string' || fieldValue === null
    ? fieldValue
    : undefined;
}

function optionalNumber(
  value: Record<string, unknown>,
  field: string
): number | null | undefined {
  const fieldValue = value[field];
  return isFiniteNumber(fieldValue) || fieldValue === null
    ? fieldValue
    : undefined;
}

function optionalStringArray(
  value: Record<string, unknown>,
  field: string
): string[] | null | undefined {
  const fieldValue = value[field];
  if (fieldValue === null) return null;
  if (
    Array.isArray(fieldValue) &&
    fieldValue.every((item) => typeof item === 'string')
  ) {
    return [...fieldValue];
  }
  return undefined;
}

function parseMatchedTerms(value: unknown): MatchedTerm[] | null | undefined {
  if (value === null) return null;
  if (!Array.isArray(value)) return undefined;

  const parsed: MatchedTerm[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      !Number.isInteger(item.term_id) ||
      typeof item.term !== 'string' ||
      typeof item.language !== 'string' ||
      typeof item.match_type !== 'string'
    ) {
      return undefined;
    }
    parsed.push({
      term_id: item.term_id as number,
      term: item.term,
      language: item.language,
      match_type: item.match_type,
    });
  }
  return parsed;
}

export function parseSeverityEvidence(value: unknown): {
  evidence: SeverityEvidence | null | undefined;
  state: SeverityEvidenceState;
} {
  if (value === null) {
    return { evidence: null, state: 'historical-unavailable' };
  }
  if (value === undefined) {
    return { evidence: undefined, state: 'not-provided' };
  }
  if (!isRecord(value)) {
    return { evidence: undefined, state: 'malformed' };
  }

  const level = normalizeCanonicalSeverity(value.level);
  if (!level || !Array.isArray(value.reasons)) {
    return { evidence: undefined, state: 'malformed' };
  }
  if (
    !value.reasons.every(
      (reason) => typeof reason === 'string' && reason.trim().length > 0
    )
  ) {
    return { evidence: undefined, state: 'malformed' };
  }

  let termCategories: Record<string, string[]> | undefined;
  if (value.term_categories !== undefined) {
    if (!isRecord(value.term_categories)) {
      return { evidence: undefined, state: 'malformed' };
    }
    termCategories = {};
    for (const [category, terms] of Object.entries(value.term_categories)) {
      if (
        category.trim().length === 0 ||
        !Array.isArray(terms) ||
        !terms.every(
          (term) => typeof term === 'string' && term.trim().length > 0
        )
      ) {
        return { evidence: undefined, state: 'malformed' };
      }
      termCategories[category] = [...terms];
    }
  }

  let supportingEvidence: string[] | undefined;
  if (value.supporting_evidence !== undefined) {
    if (
      !Array.isArray(value.supporting_evidence) ||
      !value.supporting_evidence.every(
        (item) => typeof item === 'string' && item.trim().length > 0
      )
    ) {
      return { evidence: undefined, state: 'malformed' };
    }
    supportingEvidence = [...value.supporting_evidence];
  }

  const evidence: SeverityEvidence = {
    level,
    reasons: [...value.reasons],
    ...(termCategories ? { term_categories: termCategories } : {}),
    ...(supportingEvidence
      ? { supporting_evidence: supportingEvidence }
      : {}),
  };
  const hasContent =
    evidence.reasons.length > 0 ||
    Object.keys(evidence.term_categories ?? {}).length > 0 ||
    (evidence.supporting_evidence?.length ?? 0) > 0;
  return { evidence, state: hasContent ? 'available' : 'empty' };
}

function parseAlert(value: unknown, index: number, endpoint: string): Alert {
  const path = `items[${index}]`;
  if (!isRecord(value)) {
    throw new AlertContractError(endpoint, `${path} must be an object`);
  }
  if (!Number.isSafeInteger(value.id) || (value.id as number) <= 0) {
    throw new AlertContractError(endpoint, `${path}.id must be a positive integer`);
  }
  if (typeof value.severity !== 'string') {
    throw new AlertContractError(endpoint, `${path}.severity must be a string`);
  }
  if (
    !isFiniteNumber(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1
  ) {
    throw new AlertContractError(
      endpoint,
      `${path}.confidence must be between 0 and 1`
    );
  }
  if (!isFiniteNumber(value.duration) || value.duration < 0) {
    throw new AlertContractError(
      endpoint,
      `${path}.duration must be a non-negative number`
    );
  }
  if (
    typeof value.location !== 'string' ||
    typeof value.status !== 'string' ||
    typeof value.created_at !== 'string' ||
    Number.isNaN(Date.parse(value.created_at))
  ) {
    throw new AlertContractError(
      endpoint,
      `${path} is missing location, status, or timestamp`
    );
  }

  const severityLevel =
    value.severity_level === null
      ? null
      : normalizeCanonicalSeverity(value.severity_level);
  const severity = normalizeAlertSeverity(severityLevel ?? value.severity);
  const evidenceResult = parseSeverityEvidence(value.severity_evidence);
  const language =
    typeof value.language === 'string' &&
    ALERT_LANGUAGES.has(value.language as AlertLanguage)
      ? (value.language as AlertLanguage)
      : value.language === null
        ? null
        : undefined;
  const waveform =
    value.waveform_snapshot === null
      ? null
      : Array.isArray(value.waveform_snapshot) &&
          value.waveform_snapshot.every(isFiniteNumber)
        ? [...value.waveform_snapshot]
        : undefined;
  const yamnetRan =
    typeof value.yamnet_ran === 'boolean' || value.yamnet_ran === null
      ? value.yamnet_ran
      : undefined;

  const eventId = optionalString(value, 'event_id');
  const validEventId =
    eventId === null ||
    (typeof eventId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        eventId
      ))
      ? eventId
      : undefined;

  return {
    id: value.id as number,
    event_id: validEventId,
    severity,
    severity_level: severityLevel,
    severity_evidence: evidenceResult.evidence,
    severity_evidence_state: evidenceResult.state,
    review_notice: optionalString(value, 'review_notice'),
    confidence: value.confidence,
    duration: value.duration,
    location: value.location,
    status: value.status,
    created_at: value.created_at,
    transcript: optionalString(value, 'transcript'),
    transcribed_text: optionalString(value, 'transcribed_text'),
    detected_words: optionalStringArray(value, 'detected_words'),
    yamnet_class: optionalString(value, 'yamnet_class'),
    yamnet_score: optionalNumber(value, 'yamnet_score'),
    yamnet_ran: yamnetRan,
    emotion: optionalString(value, 'emotion'),
    tone: optionalString(value, 'tone'),
    track: optionalString(value, 'track'),
    rms: optionalNumber(value, 'rms'),
    energy_variance: optionalNumber(value, 'energy_variance'),
    zero_crossing_rate: optionalNumber(value, 'zero_crossing_rate'),
    peak_to_average: optionalNumber(value, 'peak_to_average'),
    waveform_snapshot: waveform,
    categories: optionalStringArray(value, 'categories'),
    language,
    language_confidence: optionalNumber(value, 'language_confidence'),
    matched_terms: parseMatchedTerms(value.matched_terms),
    hard_hits: optionalStringArray(value, 'hard_hits'),
    soft_hits: optionalStringArray(value, 'soft_hits'),
    duration_gate: optionalString(value, 'duration_gate'),
    required_duration: optionalNumber(value, 'required_duration'),
  };
}

export function parseAlertListResponse(
  value: unknown,
  endpoint = '/alerts/'
): Alert[] {
  if (!Array.isArray(value)) {
    throw new AlertContractError(endpoint, 'expected an array');
  }
  return value.map((alert, index) => parseAlert(alert, index, endpoint));
}

export function parseAlertResponse(
  value: unknown,
  endpoint = '/alerts/{alert_id}'
): Alert {
  return parseAlert(value, 0, endpoint);
}
