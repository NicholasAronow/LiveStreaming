/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5865F2',
          hover: '#4752C4',
        },
        success: '#3BA55C',
        danger: '#ED4245',
        warning: '#FAA61A',
        'bg-primary': '#0F0F10',
        'bg-secondary': '#18181B',
        'bg-tertiary': '#1F1F23',
        'text-primary': '#FFFFFF',
        'text-secondary': '#B4B4B9',
        border: '#2A2A2F',
      },
      borderRadius: {
        'custom': '12px',
      },
      boxShadow: {
        'custom': '0 4px 12px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-custom': 'pulse-custom 2s infinite',
        'fadeIn': 'fadeIn 0.3s ease-in',
        'gradient-wave-long': 'gradient-wave 20s ease-in-out infinite',
        'gradient-wave-very-slow': 'gradient-wave-slow 30s ease-in-out infinite',
        'color-wave-long': 'color-wave 18s ease-in-out infinite',
        'color-wave-very-slow': 'color-wave-slow 25s ease-in-out infinite',
      },
      keyframes: {
        'pulse-custom': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'gradient-wave': {
          '0%, 100%': {
            transform: 'scale(1) rotate(0deg)',
          },
          '25%': {
            transform: 'scale(1.02) rotate(0.5deg)',
          },
          '50%': {
            transform: 'scale(1.03) rotate(0deg)',
          },
          '75%': {
            transform: 'scale(1.02) rotate(-0.5deg)',
          },
        },
        'gradient-wave-slow': {
          '0%, 100%': {
            transform: 'scale(1) rotate(0deg)',
          },
          '33%': {
            transform: 'scale(1.015) rotate(-0.3deg)',
          },
          '66%': {
            transform: 'scale(1.025) rotate(0.3deg)',
          },
        },
        'color-wave': {
          '0%, 100%': {
            opacity: '0.35',
            filter: 'brightness(1) saturate(1)',
          },
          '25%': {
            opacity: '0.25',
            filter: 'brightness(1.3) saturate(0.7)',
          },
          '50%': {
            opacity: '0.15',
            filter: 'brightness(1.5) saturate(0.4)',
          },
          '75%': {
            opacity: '0.25',
            filter: 'brightness(1.3) saturate(0.7)',
          },
        },
        'color-wave-slow': {
          '0%, 100%': {
            opacity: '0.3',
            filter: 'brightness(1) saturate(1)',
          },
          '33%': {
            opacity: '0.2',
            filter: 'brightness(1.4) saturate(0.6)',
          },
          '66%': {
            opacity: '0.12',
            filter: 'brightness(1.6) saturate(0.3)',
          },
        },
      },
    },
  },
  plugins: [],
}
