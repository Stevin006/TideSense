import type { DetectionResult } from '../types/detection';

const SAFE_MESSAGES = [
  'Conditions look calm. Stay aware of your surroundings.',
  'No riptide indicators detected. Enjoy your swim!',
  'Gentle currents today. Stay within sight of a lifeguard.',
];

const UNSAFE_MESSAGES = [
  'Strong lateral currents spotted. Stay on shore and alert others.',
  'Riptide signature detected. Avoid entering the water.',
  'Hazardous conditions present. Notify beach safety officials.',
];

const LOCATIONS = [
  'Santa Monica Beach',
  'Malibu Surfrider Beach',
  'Huntington Beach Pier',
  'La Jolla Shores',
];

const WAVE_HEIGHTS = ['0.5 m', '0.8 m', '1.2 m', '1.5 m', '2.0 m'];
const CURRENT_STRENGTHS = ['Calm', 'Mild', 'Moderate', 'Strong', 'Severe'];

const getRandomItem = <T,>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

export const generateMockDetectionResult = (): DetectionResult => {
  const isSafe = Math.random() > 0.4;
  const probability = isSafe
    ? Math.floor(5 + Math.random() * 25)
    : Math.floor(60 + Math.random() * 35);

  return {
    status: isSafe ? 'SAFE' : 'UNSAFE',
    probability,
    waveHeight: getRandomItem(WAVE_HEIGHTS),
    currentStrength: isSafe
      ? getRandomItem(['Calm', 'Mild'])
      : getRandomItem(['Moderate', 'Strong', 'Severe']),
    location: getRandomItem(LOCATIONS),
    recommendations: isSafe
      ? [
          'Swim with a buddy and stay attentive.',
          'Stay within designated swim zones.',
          getRandomItem(SAFE_MESSAGES),
        ]
      : [
          'Do not enter the water until conditions improve.',
          'Alert nearby swimmers and lifeguards.',
          getRandomItem(UNSAFE_MESSAGES),
        ],
    timestamp: new Date().toISOString(),
  };
};

