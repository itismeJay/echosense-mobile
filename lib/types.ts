export interface Alert {
  id: number;
  event_id?: string | null;
  severity: 'high' | 'medium' | 'low' | string;
  confidence: number;
  duration: number;
  location: string;
  status: string;
  created_at: string;

  // ── Rich evidence (all optional — backend may omit on older alerts) ──
  transcribed_text?: string | null;
  detected_words?: string[] | null;
  yamnet_class?: string | null;
  yamnet_score?: number | null;
  yamnet_ran?: boolean | null;
  emotion?: string | null;
  rms?: number | null;
  energy_variance?: number | null;
  zero_crossing_rate?: number | null;
  peak_to_average?: number | null;
  waveform_snapshot?: number[] | null;
  categories?: string[] | null;
  language?: 'fil' | 'ceb' | 'en' | 'mixed' | 'unknown' | string | null;
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

export type Severity = 'high' | 'medium' | 'low';
