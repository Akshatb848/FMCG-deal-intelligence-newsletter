import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))',
        input:  'hsl(var(--input))',
        ring:   'hsl(var(--ring))',
        brand: {
          blue:    '#3B82F6',
          violet:  '#8B5CF6',
          cyan:    '#06B6D4',
          emerald: '#10B981',
          amber:   '#F59E0B',
          rose:    '#F43F5E',
        },
        neon: {
          blue:   '#60a5fa',
          violet: '#a78bfa',
          cyan:   '#22d3ee',
          green:  '#34d399',
          amber:  '#fbbf24',
          rose:   '#fb7185',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':  'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'grid-pattern':    'linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.022) 1px, transparent 1px)',
        'dot-pattern':     'radial-gradient(rgba(255,255,255,0.055) 1px, transparent 1px)',
        'glow-blue':       'radial-gradient(ellipse at center, rgba(59,130,246,0.18) 0%, transparent 70%)',
        'glow-violet':     'radial-gradient(ellipse at center, rgba(139,92,246,0.15) 0%, transparent 70%)',
        'hero-gradient':   'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.2) 0%, transparent 70%)',
        'pipeline-beam':   'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.8) 50%, transparent 100%)',
      },
      backgroundSize: {
        'grid': '40px 40px',
        'dot':  '20px 20px',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      animation: {
        'shimmer':        'shimmer 1.8s linear infinite',
        'pulse-slow':     'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'float':          'float 6s ease-in-out infinite',
        'orb-float':      'orbFloat 9s ease-in-out infinite',
        'glow':           'pulseRing 1.8s ease-in-out infinite',
        'slide-up':       'fadeIn 0.4s ease-out',
        'gradient-x':     'gradientX 4s ease infinite',
        'spin-slow':      'spinSlow 8s linear infinite',
        'pipeline-flow':  'pipelineFlow 1.8s linear infinite',
        'scan':           'scanline 5s linear infinite',
        'border-glow':    'borderGlow 3s ease-in-out infinite',
        'ping-slow':      'ping 2.5s cubic-bezier(0,0,0.2,1) infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-400% 0' },
          '100%': { backgroundPosition: '400% 0' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
        orbFloat: {
          '0%,100%': { transform: 'translateY(0) scale(1)' },
          '33%':     { transform: 'translateY(-24px) scale(1.06)' },
          '66%':     { transform: 'translateY(12px) scale(0.96)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        gradientX: {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%':     { backgroundPosition: '100% 50%' },
        },
        spinSlow: {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        pipelineFlow: {
          '0%':   { left: '-50%' },
          '100%': { left: '150%' },
        },
        scanline: {
          '0%':   { top: '-2px', opacity: '0' },
          '5%':   { opacity: '1' },
          '95%':  { opacity: '1' },
          '100%': { top: '100%', opacity: '0' },
        },
        borderGlow: {
          '0%,100%': { borderColor: 'rgba(59,130,246,0.3)', boxShadow: '0 0 8px rgba(59,130,246,0.2)' },
          '50%':     { borderColor: 'rgba(139,92,246,0.4)', boxShadow: '0 0 20px rgba(139,92,246,0.3)' },
        },
        pulseRing: {
          '0%':   { boxShadow: '0 0 0 0 rgba(59,130,246,0.5)' },
          '70%':  { boxShadow: '0 0 0 10px rgba(59,130,246,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(59,130,246,0)' },
        },
      },
      backdropBlur: { xs: '2px' },
      boxShadow: {
        'neon-blue':   '0 0 20px rgba(59,130,246,0.4), 0 0 60px rgba(59,130,246,0.15)',
        'neon-violet': '0 0 20px rgba(139,92,246,0.4), 0 0 60px rgba(139,92,246,0.15)',
        'neon-green':  '0 0 20px rgba(16,185,129,0.4), 0 0 60px rgba(16,185,129,0.15)',
        'card-hover':  '0 16px 48px -8px rgba(59,130,246,0.2)',
      },
    },
  },
  plugins: [],
};

export default config;
