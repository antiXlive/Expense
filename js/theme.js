// js/theme.js - Centralized theme configuration
export const THEME = {
  // Primary Colors
  colors: {
    primary: '#2563eb',
    secondary: '#06b6d4',
    accent: '#2dd4bf',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    destructive: '#fb7185',
    
    // Backgrounds
    bg: {
      base: '#020617',
      card: '#0D1525',
      header: 'rgba(2, 6, 23, 0.95)',
      overlay: 'rgba(2, 6, 23, 0.6)',
      glass: 'rgba(2, 6, 23, 0.88)',
    },
    
    // Text
    text: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
      muted: '#94a3b8',
      light: '#e8eeff',
      faint: '#475569',
    },
    
    // Borders
    border: {
      subtle: 'rgba(255, 255, 255, 0.05)',
      light: 'rgba(148, 163, 184, 0.1)',
      medium: 'rgba(71, 85, 105, 0.4)',
      strong: 'rgba(59, 130, 246, 0.3)',
    },
    
    // Status
    status: {
      online: '#10b981',
      offline: '#64748b',
      positive: '#10b981',
      negative: '#fb7185',
    },
  },
  
  // Typography
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    sizes: {
      xs: '11px',
      sm: '12px',
      base: '13px',
      lg: '14px',
      xl: '15px',
      '2xl': '16px',
      '3xl': '20px',
      '4xl': '28px',
    },
    weights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
  },
  
  // Spacing
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
  },
  
  // Border radius
  radius: {
    sm: '8px',
    md: '12px',
    lg: '14px',
    xl: '20px',
    full: '999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.40)',
    md: '0 4px 8px rgba(0, 0, 0, 0.55)',
    lg: '0 6px 24px rgba(2, 6, 23, 0.6)',
    xl: '0 18px 46px rgba(0, 0, 0, 0.45)',
  },
  
  // Animations
  transitions: {
    fast: '140ms',
    base: '180ms',
    slow: '240ms',
    slower: '320ms',
    easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)',
    easingOut: 'cubic-bezier(.2,.6,.3,1)',
  },
  
  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
    accent: 'linear-gradient(45deg, #2563eb, #06b6d4, #2dd4bf)',
    cardBg: 'linear-gradient(165deg, #091320, #0B162A)',
    tabBg: 'linear-gradient(180deg, #121418f5, #0e1014f2, #0a0c10ef)',
    todayBg: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(6, 182, 212, 0.1))',
  },
  
  // Z-index layers
  zIndex: {
    base: 1,
    sticky: 10,
    overlay: 100,
    modal: 1000,
    header: 1000,
    tabBar: 9999,
  },
  
  // Component-specific
  components: {
    header: {
      height: '62px',
      zIndex: 1000,
    },
    tabBar: {
      height: '66px',
      pillHeight: '66px',
      fabSize: '68px',
      fabTop: '-30px',
    },
    transactionItem: {
      height: 'auto',
      padding: '10px 12px',
    },
    dayHeader: {
      padding: '12px 12px',
      minWidthAmount: '90px',
    },
  },
};

export const getCSSVariables = () => {
  const vars = {};
  
  // Colors
  Object.entries(THEME.colors).forEach(([key, value]) => {
    if (typeof value === 'object') {
      Object.entries(value).forEach(([subKey, subValue]) => {
        vars[`--color-${key}-${subKey}`] = subValue;
      });
    } else {
      vars[`--color-${key}`] = value;
    }
  });
  
  // Typography
  Object.entries(THEME.typography.sizes).forEach(([key, value]) => {
    vars[`--size-${key}`] = value;
  });
  
  Object.entries(THEME.typography.weights).forEach(([key, value]) => {
    vars[`--weight-${key}`] = value;
  });
  
  // Spacing
  Object.entries(THEME.spacing).forEach(([key, value]) => {
    vars[`--spacing-${key}`] = value;
  });
  
  // Radius
  Object.entries(THEME.radius).forEach(([key, value]) => {
    vars[`--radius-${key}`] = value;
  });
  
  // Shadows
  Object.entries(THEME.shadows).forEach(([key, value]) => {
    vars[`--shadow-${key}`] = value;
  });
  
  // Transitions
  vars['--transition-fast'] = THEME.transitions.fast;
  vars['--transition-base'] = THEME.transitions.base;
  vars['--transition-slow'] = THEME.transitions.slow;
  vars['--transition-easing'] = THEME.transitions.easing;
  
  return vars;
};
