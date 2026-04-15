export interface Alert {
  id: number;
  severity: 'high' | 'medium' | 'low' | string;
  confidence: number;
  duration: number;
  location: string;
  status: string;
  created_at: string;
}

export interface LogStats {
  total_alerts: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;
}

export type Severity = 'high' | 'medium' | 'low';
