export type DetectionStatus = 'SAFE' | 'UNSAFE';

export type DetectionResult = {
  status: DetectionStatus;
  probability: number;
  waveHeight: string;
  currentStrength: string;
  location: string;
  recommendations: string[];
  timestamp: string;
};

