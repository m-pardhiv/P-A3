import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem' },
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        // Brightloop brand palette (from the supplied reference)
        brand: {
          ember: '#E2503A',
          raspberry: '#B51F52',
          blush: '#FFA2B6',
          amber: '#EFB11D',
          cream: '#EBE9E1',
          // Deeper steps used wherever text must sit on / beside brand colour
          ink: '#8F1741',
          50: '#FFF3F5',
          100: '#FFE6EB',
          200: '#FFD0DA',
        },
        success: { DEFAULT: '#15803D', soft: '#E8F5EC' },
        warning: { DEFAULT: '#92600A', soft: '#FDF3D9' },
        danger: { DEFAULT: '#B91C1C', soft: '#FDECEC' },
      },
      borderRadius: {
        card: '1.25rem',
        control: '0.75rem',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(24, 20, 16, 0.04), 0 4px 16px -4px rgba(24, 20, 16, 0.06)',
        lift: '0 2px 4px rgba(24, 20, 16, 0.04), 0 12px 32px -8px rgba(24, 20, 16, 0.14)',
        glow: '0 8px 24px -8px rgba(181, 31, 82, 0.5)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #E2503A 0%, #B51F52 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, #FFE1D8 0%, #FFD0DA 100%)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-scale-in': 'fade-scale-in 0.14s ease-out',
        float: 'float 6s ease-in-out infinite',
        blink: 'blink 1s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
