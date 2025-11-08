import type { DetectionResult } from '../types/detection';

export type RootStackParamList = {
  Home: undefined;
  Camera: undefined;
  Results: { result: DetectionResult };
};

