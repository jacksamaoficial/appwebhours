// Minimalist color palette inspired by Revolut/Aplázame
export const colors = {
  // Base
  background: '#0A0A0A',
  backgroundSecondary: '#141414',
  card: '#1A1A1A',
  cardSecondary: '#222222',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  
  // Accent - Turquoise
  primary: '#00CED1', // Dark Turquoise
  primaryLight: '#40E0D0',
  primaryDark: '#008B8B',
  
  // Status
  success: '#10B981',
  successLight: '#34D399',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  danger: '#EF4444',
  dangerLight: '#F87171',
  
  // Income/Expense
  income: '#10B981',
  expense: '#EF4444',
  
  // Borders
  border: '#2D2D2D',
  borderLight: '#3D3D3D',
  
  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 4,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
