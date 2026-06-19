/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#FAFAF6',
        ink: '#1E293B',
        gold: '#F59E0B',
      },
      boxShadow: {
        brutal: '4px 4px 0px 0px #1E293B',
      },
    },
  },
  plugins: [],
}