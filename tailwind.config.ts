import type { Config } from "tailwindcss";

const config: Config = {

  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fat Big Quiz Brand Colors
        'primary': '#673ab7',
        'primary-dark': '#512da8',
        'primary-light': '#9c27b0',
        'background': '#f0ebf8',
        'surface': '#ffffff',
        'text-primary': '#202124',
        'text-secondary': '#5f6368',
        'border': '#dadce0',
        'success': '#4caf50',
        'success-dark': '#137333',
        'error': '#d32f2f',
        'warning': '#ff9800',
        'info': '#1976d2',
        'gold': '#ffd700',
      },
      fontFamily: {
        'poppins': ['Poppins', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
    require("daisyui"),
  ],
};


export default config;

