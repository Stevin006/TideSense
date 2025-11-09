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
  const rand = Math.random();
  let status: DetectionResult['status'];
  let probability: number;
  
  if (rand < 0.3) {
    status = 'LOW';
    probability = Math.floor(5 + Math.random() * 25);
  } else if (rand < 0.6) {
    status = 'MODERATE';
    probability = Math.floor(30 + Math.random() * 30);
  } else {
    status = 'HIGH';
    probability = Math.floor(60 + Math.random() * 35);
  }

  const isSafe = status === 'LOW';

  return {
    status,
    probability,
    timestamp: new Date().toISOString(),
    location: {
      name: getRandomItem(LOCATIONS),
    },
    weatherAlerts: null,
    waveHeight: getRandomItem(WAVE_HEIGHTS),
    currentStrength: isSafe
      ? getRandomItem(['Calm', 'Mild'])
      : getRandomItem(['Moderate', 'Strong', 'Severe']),
    recommendations: isSafe
      ? [
          '✅ Conditions appear relatively safe',
          'Swim with a buddy and stay attentive.',
          'Stay within designated swim zones.',
          getRandomItem(SAFE_MESSAGES),
        ]
      : status === 'MODERATE'
      ? [
          '⚡ CAUTION - Possible riptide conditions detected',
          'Exercise extreme caution if entering water',
          'Stay close to shore and in designated swimming areas',
          'Swim parallel to shore if caught in a current',
        ]
      : [
          '⚠️ DO NOT ENTER THE WATER - Dangerous riptide detected',
          'Do not enter the water until conditions improve.',
          'Alert nearby swimmers and lifeguards.',
          getRandomItem(UNSAFE_MESSAGES),
        ],
  };
};

