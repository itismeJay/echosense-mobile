export interface Alert {
  id: number;
  severity: 'high' | 'medium' | 'low' | string;
  confidence: number;
  duration: number;
  location: string;
  status: string;
  created_at: string;

  // ── Rich evidence (all optional — backend may omit on older alerts) ──
  transcribed_text?: string;
  detected_words?: string[];
  yamnet_class?: string;
  yamnet_score?: number;
  emotion?: string;
  rms?: number;
  energy_variance?: number;
  zero_crossing_rate?: number;
  peak_to_average?: number;
  waveform_snapshot?: number[];
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
