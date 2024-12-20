import { fontFamily } from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '.BU_dark-scheme'],
  content: {
    relative: true,
    files: ['!../../**/node_modules', '../../**/*.{jsx,ts,tsx,html}'],
  },
  theme: {
    container: {
      center: 'true',
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // gray: {
        //   50: 'hsl(var(--BV-gray-50))',
        //   75: 'hsl(var(--BV-gray-75))',
        //   100: 'hsl(var(--BV-gray-100))',
        //   200: 'hsl(var(--BV-gray-200))',
        //   300: 'hsl(var(--BV-gray-300))',
        //   400: 'hsl(var(--BV-gray-400))',
        //   500: 'hsl(var(--BV-gray-500))',
        //   600: 'hsl(var(--BV-gray-600))',
        //   700: 'hsl(var(--BV-gray-700))',
        //   800: 'hsl(var(--BV-gray-800))',
        //   900: 'hsl(var(--BV-gray-900))',
        // },
        border: 'hsl(var(--BV-border))',
        input: 'hsl(var(--BV-input))',
        ring: 'hsl(var(--BV-ring))',
        background: 'hsl(var(--BV-background))',
        foreground: 'hsl(var(--BV-foreground))',
        primary: {
          DEFAULT: 'hsl(var(--BV-primary))',
          foreground: 'hsl(var(--BV-primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--BV-secondary))',
          foreground: 'hsl(var(--BV-secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--BV-destructive))',
          foreground: 'hsl(var(--BV-destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--BV-muted))',
          foreground: 'hsl(var(--BV-muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--BV-accent))',
          foreground: 'hsl(var(--BV-accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--BV-popover))',
          foreground: 'hsl(var(--BV-popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--BV-card))',
          foreground: 'hsl(var(--BV-card-foreground))',
        },
        pop: {
          DEFAULT: 'hsl(var(--BV-pop))',
          foreground: 'hsl(var(--BV-pop-foreground))',
        },
        chart: {
          1: 'hsl(var(--BV-chart-1))',
          2: 'hsl(var(--BV-chart-2))',
          3: 'hsl(var(--BV-chart-3))',
          4: 'hsl(var(--BV-chart-4))',
          5: 'hsl(var(--BV-chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--BV-sidebar-background))',
          foreground: 'hsl(var(--BV-sidebar-foreground))',
          primary: 'hsl(var(--BV-sidebar-primary))',
          'primary-foreground': 'hsl(var(--BV-sidebar-primary-foreground))',
          accent: 'hsl(var(--BV-sidebar-accent))',
          'accent-foreground': 'hsl(var(--BV-sidebar-accent-foreground))',
          border: 'hsl(var(--BV-sidebar-border))',
          ring: 'hsl(var(--BV-sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--BV-radius)',
        md: 'calc(var(--BV-radius) - 2px)',
        sm: 'calc(var(--BV-radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--BV-font-sans)', ...fontFamily.sans],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'editor-selected-node': {
          from: {
            borderRadius: '2px',
            backgroundColor: 'hsl(var(--BV-accent))',
          },
          to: {
            backgroundColor: 'transparent',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'editor-selected-node':
          'editor-selected-node 0.8s cubic-bezier(0.455, 0.03, 0.515, 0.955)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
