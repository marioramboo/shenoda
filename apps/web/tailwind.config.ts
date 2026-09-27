import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#1F3A5F',        // Deep Coptic Blue (Header, Primary CTA)
          'primary-dark': '#152A47', // Active/Hover Deep Blue
          'primary-soft': '#E6ECF5', // Light tint for selection & active tabs
          accent: '#B8892B',         // Liturgical Gold / Warm Ochre
          'accent-soft': '#F7EDD5',  // Subtle gold highlight
        },
        bg: {
          app: '#F6F4EE',            // Warm off-white / parchment background
          surface: '#FFFFFF',        // Card and container surface
          muted: '#EFECE3',          // Neutral container background / dividers
        },
        border: {
          default: '#E3DFD3',        // Input & card border
          focus: '#1F3A5F',          // Focused input ring
        },
        text: {
          primary: '#1B2432',        // High-contrast charcoal text
          secondary: '#5F6A7A',      // Supporting & metadata label text
          disabled: '#9AA3AF',       // Inactive states & placeholders
          inverse: '#FFFFFF',        // White text on dark brand surfaces
        },
        status: {
          success: '#2F855A',        // Present / Good standing / Green
          'success-soft': '#E6F4EA',
          danger: '#C0392B',         // Absent / Alert / Red
          'danger-soft': '#FCE8E6',
          warning: '#B7791F',        // Excused / Late / Warning Ochre
          'warning-soft': '#FEF7E0',
          info: '#2B6CB0',           // General notices
          'info-soft': '#EBF8FF',
        },
      },
      fontFamily: {
        cairo: ['var(--font-cairo)', 'sans-serif'],
      },
      fontSize: {
        'display': ['1.75rem', { lineHeight: '2.25rem', fontWeight: '700' }], // 28px
        'h1': ['1.375rem', { lineHeight: '1.875rem', fontWeight: '700' }],     // 22px
        'h2': ['1.125rem', { lineHeight: '1.625rem', fontWeight: '600' }],     // 18px
        'body-default': ['0.9375rem', { lineHeight: '1.375rem', fontWeight: '400' }], // 15px
        'body-medium': ['0.9375rem', { lineHeight: '1.375rem', fontWeight: '500' }],
        'body-small': ['0.8125rem', { lineHeight: '1.125rem', fontWeight: '400' }],  // 13px
        'caption': ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],            // 12px
        'button': ['0.9375rem', { lineHeight: '1.25rem', fontWeight: '600' }],
      },
      boxShadow: {
        'card': '0 2px 6px 0 rgba(31, 58, 95, 0.05)',
        'nav': '0 -2px 10px 0 rgba(31, 58, 95, 0.08)',
        'elevated': '0 4px 16px 0 rgba(31, 58, 95, 0.12)',
      },
      borderRadius: {
        'card': '12px',
        'input': '10px',
        'button': '10px',
        'pill': '9999px',
      },
    },
  },
  plugins: [],
};

export default config;
