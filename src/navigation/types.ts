import type { DetectionResult } from '../types/detection';

export type RootStackParamList = {
  Home: undefined;
  Camera: undefined;
  Results: { result?: DetectionResult; detectionId?: number };
  History: undefined;
  Chat: { detection?: DetectionResult };
  Weather: undefined;
  SafetyMap: undefined;
  Analytics: undefined;
};

