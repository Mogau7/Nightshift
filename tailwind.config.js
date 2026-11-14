/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#030507',
        deep: '#0a0f14',
        radar: '#34f5a2',
        bounty: '#ffb547',
        bone: '#e7efe9',
        mist: '#8a9a92',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
