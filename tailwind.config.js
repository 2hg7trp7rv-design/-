/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
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
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        'soil-dark': '#5D4037',
        'soil-mid': '#795548',
        'soil-light': '#A1887F',
        'fur-highlight': '#BCAAA4',
        'grass-dark': '#2E7D32',
        'grass-mid': '#43A047',
        'grass-light': '#66BB6A',
        'sky-top': '#4FC3F7',
        'sky-bottom': '#81D4FA',
        'dirt-rim': '#8D6E63',
        'hole-inner': '#3E2723',
        'accent-pink': '#F06292',
        'accent-pink-hover': '#EC407A',
        'accent-yellow': '#FFD54F',
        'accent-gold': '#FFD700',
        'accent-orange': '#FF8F00',
        'accent-red': '#E53935',
        'accent-cyan': '#26C6DA',
        'bg-cream': '#FFF8E1',
        'text-dark': '#3E2723',
        'text-mid': '#6D4C41',
        'text-light': '#8D6E63',
      },
      fontFamily: {
        display: [
          'ui-rounded',
          '"Hiragino Maru Gothic ProN"',
          '"Arial Rounded MT Bold"',
          '"Trebuchet MS"',
          'system-ui',
          'sans-serif',
        ],
        body: [
          'ui-rounded',
          '"Hiragino Maru Gothic ProN"',
          '"Hiragino Sans"',
          '"Yu Gothic"',
          'Meiryo',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        xl: 'calc(var(--radius) + 4px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xs: 'calc(var(--radius) - 6px)',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        game: '0 8px 0 #5D4037, 0 12px 24px rgba(0,0,0,0.15)',
        'game-pressed': '0 2px 0 #5D4037, 0 4px 8px rgba(0,0,0,0.15)',
        'btn-pink': '0 6px 0 #C2185B, 0 8px 16px rgba(240, 98, 146, 0.3)',
        'btn-pink-pressed': '0 2px 0 #C2185B, 0 4px 8px rgba(240, 98, 146, 0.3)',
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
        'caret-blink': {
          '0%,70%,100%': { opacity: '1' },
          '20%,50%': { opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(-10px)' },
          '50%': { transform: 'translateY(10px)' },
        },
        pop: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '50%': { transform: 'translateX(5px)' },
          '75%': { transform: 'translateX(-5px)' },
        },
        'pulse-glow': {
          '0%, 100%': {
            transform: 'scale(1)',
            boxShadow: '0 6px 0 #C2185B, 0 8px 16px rgba(240, 98, 146, 0.3)',
          },
          '50%': {
            transform: 'scale(1.02)',
            boxShadow: '0 6px 0 #C2185B, 0 8px 24px rgba(240, 98, 146, 0.5)',
          },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'cloud-drift': {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(120vw)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'caret-blink': 'caret-blink 1.25s ease-out infinite',
        float: 'float 3s ease-in-out infinite',
        pop: 'pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        shake: 'shake 0.2s ease-in-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'cloud-drift': 'cloud-drift 25s linear infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
