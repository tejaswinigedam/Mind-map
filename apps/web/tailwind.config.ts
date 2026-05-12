import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // shadcn/ui CSS-variable-based semantic colors
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        // Brand palette
        brand: {
          50:  '#f0f4ff',
          100: '#dde8ff',
          200: '#b8ccff',
          300: '#85a5ff',
          400: '#5a7ef5',
          500: '#3b5bdb', // root node
          600: '#2f4cca',
          700: '#2540b0',
          800: '#1d3390',
          900: '#162870',
        },
        // Depth colors for mind map nodes
        depth: {
          0: '#3b5bdb', // root — brand blue
          1: '#e8590c', // level 1 — warm orange
          2: '#2f9e44', // level 2 — green
          3: '#7048e8', // level 3 — purple
          4: '#1098ad', // level 4 — teal
          5: '#d6336c', // level 5+ — rose
        },
        // Canvas
        canvas: {
          bg: '#0f1117',
          'bg-light': '#f8f9fc',
          grid: '#1e2132',
          'grid-light': '#e8eaf0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 1.5s infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      borderRadius: {
        node: '12px',
      },
      boxShadow: {
        node: '0 2px 12px rgba(0,0,0,0.3)',
        'node-hover': '0 4px 20px rgba(0,0,0,0.5)',
        'node-selected': '0 0 0 2px #3b5bdb, 0 4px 20px rgba(59,91,219,0.3)',
        panel: '0 8px 32px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}

export default config
