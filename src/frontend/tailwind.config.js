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
      },
      keyframes: {
        'pulse-custom': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}
