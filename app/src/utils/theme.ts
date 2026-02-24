export const Colors = {
  // Backgrounds
  background: '#0A0A0F',
  surface: '#13131A',
  surfaceElevated: '#1C1C28',
  border: '#2A2A3D',

  // Accents
  accentBlue: '#4F8EF7',
  accentPurple: '#7C5CFC',

  // Text
  textPrimary: '#F0F0FF',
  textSecondary: '#8888AA',
  textDisabled: '#44445A',

  // Status
  success: '#34D399',
  error: '#F87171',

  // Scrim
  scrim: 'rgba(0,0,0,0.72)',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const Typography = {
  displayLg: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
  displaySm: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  title: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },
} as const;
