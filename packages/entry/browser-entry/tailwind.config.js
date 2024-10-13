import { fontFamily } from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '.BU_dark-scheme'],
  content: {
    relative: true,
    files: ['!../../**/node_modules', '../../**/*.{ts,tsx,html}'],
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
        gray: {
          50: 'rgb(var(--BV-gray-50) / <alpha-value>)',
          75: 'rgb(var(--BV-gray-75) / <alpha-value>)',
          100: 'rgb(var(--BV-gray-100) / <alpha-value>)',
          200: 'rgb(var(--BV-gray-200) / <alpha-value>)',
          300: 'rgb(var(--BV-gray-300) / <alpha-value>)',
          400: 'rgb(var(--BV-gray-400) / <alpha-value>)',
          500: 'rgb(var(--BV-gray-500) / <alpha-value>)',
          600: 'rgb(var(--BV-gray-600) / <alpha-value>)',
          700: 'rgb(var(--BV-gray-700) / <alpha-value>)',
          800: 'rgb(var(--BV-gray-800) / <alpha-value>)',
          900: 'rgb(var(--BV-gray-900) / <alpha-value>)',
        },
        border: 'rgb(var(--BV-border) / <alpha-value>)',
        input: 'rgb(var(--BV-input) / <alpha-value>)',
        ring: 'rgb(var(--BV-ring) / <alpha-value>)',
        background: 'rgb(var(--BV-background) / <alpha-value>)',
        foreground: 'rgb(var(--BV-foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--BV-primary) / <alpha-value>)',
          foreground: 'rgb(var(--BV-primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--BV-secondary) / <alpha-value>)',
          foreground: 'rgb(var(--BV-secondary-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(var(--BV-destructive) / <alpha-value>)',
          foreground: 'rgb(var(--BV-destructive-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--BV-muted) / <alpha-value>)',
          foreground: 'rgb(var(--BV-muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--BV-accent) / <alpha-value>)',
          foreground: 'rgb(var(--BV-accent-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'rgb(var(--BV-popover) / <alpha-value>)',
          foreground: 'rgb(var(--BV-popover-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'rgb(var(--BV-card) / <alpha-value>)',
          foreground: 'rgb(var(--BV-card-foreground) / <alpha-value>)',
        },
        chart: {
          1: 'hsl(var(--BV-chart-1))',
          2: 'hsl(var(--BV-chart-2))',
          3: 'hsl(var(--BV-chart-3))',
          4: 'hsl(var(--BV-chart-4))',
          5: 'hsl(var(--BV-chart-5))',
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
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
