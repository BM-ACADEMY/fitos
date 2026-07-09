/** FitOS design system */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'gd-bg': '#0F1117',
        'gd-card': '#161B27',
        'gd-border': '#1E2A3A',
        'gd-green': '#00C896',
        'gd-amber': '#F59E0B',
        'gd-blue': '#3B82F6',
        'gd-purple': '#8B5CF6',
        'gd-red': '#EF4444',
        'gd-text': '#CBD5E0',
        'gd-sub': '#718096',
        'gd-head': '#F1F5F9',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
