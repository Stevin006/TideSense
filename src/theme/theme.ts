export const theme = {
  colors: {
    background: '#021E2F',
    cameraOverlay: 'rgba(2, 30, 47, 0.35)',
    primary: '#0AA5FF',
    primaryDark: '#0069C0',
    danger: '#FF5A5F',
    warning: '#FFA726',
    success: '#25D366',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.85)',
    cardBackground: 'rgba(2, 30, 47, 0.85)',
    neutral: '#0B3A50',
    divider: 'rgba(255, 255, 255, 0.1)',
  },
  spacing: (factor: number) => factor * 8,
  radii: {
    sm: 12,
    md: 20,
    lg: 28,
    pill: 999,
  },
  typography: {
    heading: '600',
    body: '400',
  },
} as const;

export type AppTheme = typeof theme;

