/**
 * Minimal Tailwind v4 config to ensure scanner receives proper source shapes.
 */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,css}',
    './app/**/*.{js,ts,jsx,tsx,css}'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
