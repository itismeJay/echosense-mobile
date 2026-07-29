export type Severity = 'high' | 'medium' | 'low';
export type AlertSeverity = Severity | 'unknown';
export type CanonicalSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type AlertLanguage = 'fil' | 'ceb' | 'en' | 'mixed' | 'unknown';
export type SeverityEvidenceState =
  | 'available'
  | 'empty'
  | 'historical-unavailable'
  | 'malformed'
  | 'not-provided';

export interface SeverityEvidence {
  level: CanonicalSeverity;
  reasons: string[];
  term_categories?: Record<string, string[]>;
  supporting_evidence?: string[];
}

export interface Alert {
  id: number;
  event_id?: string | null;
  severity: AlertSeverity;
  severity_level?: CanonicalSeverity | null;
  severity_evidence?: SeverityEvidence | null;
  severity_evidence_state: SeverityEvidenceState;
  review_notice?: string | null;
  confidence: number;
  duration: number;
  location: string;
  status: string;
  created_at: string;

  // The production response currently uses transcribed_text. transcript is
  // accepted as a compatibility alias without changing stored content.
  transcript?: string | null;
  transcribed_text?: string | null;
  detected_words?: string[] | null;
  yamnet_class?: string | null;
  yamnet_score?: number | null;
  yamnet_ran?: boolean | null;
  emotion?: string | null;
  tone?: string | null;
  track?: string | null;
  rms?: number | null;
  energy_variance?: number | null;
  zero_crossing_rate?: number | null;
  peak_to_average?: number | null;
  waveform_snapshot?: number[] | null;
  categories?: string[] | null;
  language?: AlertLanguage | null;
  language_confidence?: number | null;
  matched_terms?: MatchedTerm[] | null;
  hard_hits?: string[] | null;
  soft_hits?: string[] | null;
  duration_gate?: string | null;
  required_duration?: number | null;
}

export interface MatchedTerm {
  term_id: number;
  term: string;
  language: 'fil' | 'ceb' | 'en' | string;
  match_type: string;
}

export interface EmotionBreakdown {
  angry: number;
  aggressive: number;
  distressed: number;
  upset: number;
  neutral: number;
  unknown: number;
}

export interface LogStats {
  total_alerts: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;

  // ── Evidence aggregates (optional) ──
  emotion_breakdown?: EmotionBreakdown;
  top_detected_words?: string[];
  average_confidence?: number;
}
