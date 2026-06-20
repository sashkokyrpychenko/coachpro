// ── Theme palettes ──────────────────────────────────────
export const THEMES = {
  dark: {
    bg: '#0A0B0F',
    surface: '#101218',
    glass: 'linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.018))',
    border: 'rgba(255,255,255,.08)',
    borderMuted: 'rgba(255,255,255,.06)',
    borderLight: 'rgba(255,255,255,.04)',
    
    text: '#EAECEF',
    textMuted: '#878F9B',
    textSub: '#6B7280',
    
    accentGrad: 'linear-gradient(135deg,#5EE0CE,#3FA9F0)',
    accentTeal: '#5EE0CE',
    accentBlue: '#3FA9F0',
    successGreen: '#46DCA8',
    successTeal: '#7FD4E8',
    errorRed: '#FF6B6B',
    warningOrange: '#FF9500',
    
    overlay: 'rgba(0,0,0,.75)',
  },
  light: {
    bg: '#F5F7FA',
    surface: '#FFFFFF',
    glass: 'linear-gradient(160deg,rgba(94,224,206,.08),rgba(63,169,240,.04))',
    border: 'rgba(63,169,240,.2)',
    borderMuted: 'rgba(63,169,240,.15)',
    borderLight: 'rgba(94,224,206,.1)',
    
    text: '#1A1F2E',
    textMuted: '#6B7280',
    textSub: '#8B92A7',
    
    accentGrad: 'linear-gradient(135deg,#2B9B7A,#0066CC)',
    accentTeal: '#2B9B7A',
    accentBlue: '#0066CC',
    successGreen: '#107A5A',
    successTeal: '#1B90B0',
    errorRed: '#C41C1C',
    warningOrange: '#D97706',
    
    overlay: 'rgba(0,0,0,.5)',
  },
};

// ── Detect system theme preference ──
export const getSystemTheme = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark'; // fallback
};

// ── CSS for theme ──
export const getThemeCSS = (isDark) => {
  const theme = isDark ? THEMES.dark : THEMES.light;
  return `
    html { background: ${theme.surface} !important; height: 100%; overflow: hidden; }
    body { background: ${theme.bg} !important; color: ${theme.text} !important; font-variant-emoji: text; position: fixed; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; }
    input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(${isDark ? 1 : 0}) brightness(${isDark ? 0.6 : 1.2}) sepia(${isDark ? 1 : 0}) hue-rotate(${isDark ? 150 : 0}deg); }
    select option { background: ${isDark ? '#0D0D16' : '#F0F4F8'}; color: ${theme.text}; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: ${isDark ? '#08080F' : '#EEF2F8'}; }
    ::-webkit-scrollbar-thumb { background: ${isDark ? '#1A2E4A' : 'rgba(63,169,240,.3)'}; border-radius: 2px; }
    ::-webkit-scrollbar-thumb:hover { background: ${isDark ? '#00F5FF44' : 'rgba(63,169,240,.5)'}; }
    * { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
    button:active { opacity: 0.75; transform: scale(0.97); }
    button { transition: opacity 0.1s, transform 0.1s; }
    #root {
      box-sizing: border-box;
      height: 100%;
    }
    .safe-bottom-fill {
      position: fixed;
      left: 0; right: 0;
      bottom: calc(-1 * env(safe-area-inset-bottom));
      height: calc(env(safe-area-inset-bottom) + 2px);
      background: ${theme.surface};
      z-index: 90;
    }
    @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    @keyframes tabSlideR { from{transform:translateX(28px)} to{transform:translateX(0)} }
    @keyframes tabSlideL { from{transform:translateX(-28px)} to{transform:translateX(0)} }
    @keyframes popIn { 0%{transform:scale(0);opacity:0} 65%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
    @keyframes shimmer { 0%{background-position:200% 0}100%{background-position:-200% 0} }
    @keyframes pulseRing { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(2.2);opacity:0} }
    @keyframes growBar { 0%{transform:scaleX(0);transform-origin:left} 100%{transform:scaleX(1);transform-origin:left} }
    @keyframes pulseGlow { 0%,100%{box-shadow:0 0 0 0 ${isDark ? 'rgba(94,224,206,.4)' : 'rgba(43,155,122,.4)'}} 50%{box-shadow:0 0 0 8px ${isDark ? 'rgba(94,224,206,.0)' : 'rgba(43,155,122,.0)'}} }
  `;
};
