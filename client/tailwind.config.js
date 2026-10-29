/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', '"Noto Sans Thai"', 'system-ui', 'sans-serif'],
        thai: ['"Noto Sans Thai"', 'sans-serif'],
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      colors: {
        cream: '#ECE6D8',
        card: '#F7F5EE',
        yellow: {
          DEFAULT: '#EDB92E',
        },
        blue: {
          DEFAULT: '#2F54EB',
        },
        coral: {
          DEFAULT: '#E8505B',
        },
        mint: {
          DEFAULT: '#48C78E',
        },
      },
      boxShadow: {
        'neo': '4px 4px 0px #000000',
        'neo-hover': '6px 6px 0px #000000',
        'neo-focus': '4px 4px 0px #4D77FF',
      },
      borderWidth: {
        '3': '3px',
      },
      borderRadius: {
        DEFAULT: '6px',
        neo: '6px',
      },
    },
  },
  plugins: [],
}
