export type DetectionStatus = 'LOW' | 'MODERATE' | 'HIGH' | 'SAFE' | 'DANGER' | 'UNSAFE';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'unknown';

export type DetectionResult = {
  status: DetectionStatus;
  probability: number;
  timestamp: string;
  location?: {
    name?: string;
    latitude?: number;
    longitude?: number;
  } | null;
  weatherAlerts?: Array<{
    event: string;
    severity: string;
    description: string;
  }> | null;
  recommendations?: string[] | null;
  // Legacy fields for backwards compatibility
  waveHeight?: string;
  currentStrength?: string;
};

