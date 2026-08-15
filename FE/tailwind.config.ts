import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        panel: 'var(--color-panel)',
        'surface-hover': 'var(--color-surface-hover)',
        'surface-sunk': 'var(--color-surface-sunk)',
        border: 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
        muted: 'var(--color-muted)',
        body: 'var(--color-body)',
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        text: 'var(--color-text)',
        destructive: 'var(--color-destructive)',
        warning: 'var(--color-warning)',
      },
      spacing: {
        xs: 'var(--spacing-xs)',
        sm: 'var(--spacing-sm)',
        md: 'var(--spacing-md)',
        base: 'var(--spacing-base)',
        lg: 'var(--spacing-lg)',
        xl: 'var(--spacing-xl)',
        xxl: 'var(--spacing-xxl)',
        section: 'var(--spacing-section)',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        modal: 'var(--shadow-modal)',
        sticky: 'var(--shadow-sticky)',
      },
      fontFamily: {
        sans: [
          'var(--font-family-base)',
          {
            fontFeatureSettings: '"cv05","cv09","cv11"',
          },
        ],
      },
      fontSize: {
        display: [
          'var(--font-size-display)',
          {
            lineHeight: 'var(--line-height-title)',
            fontWeight: 'var(--font-weight-extrabold)',
            letterSpacing: 'var(--letter-spacing-display)',
          },
        ],
        'page-title': [
          'var(--font-size-page-title)',
          {
            lineHeight: 'var(--line-height-title)',
            fontWeight: 'var(--font-weight-bold)',
            letterSpacing: 'var(--letter-spacing-page-title)',
          },
        ],
        'section-title': [
          'var(--font-size-section-title)',
          {
            lineHeight: 'var(--line-height-title)',
            fontWeight: 'var(--font-weight-bold)',
            letterSpacing: 'var(--letter-spacing-section-title)',
          },
        ],
        'card-title': [
          'var(--font-size-card-title)',
          {
            lineHeight: 'var(--line-height-title)',
            fontWeight: 'var(--font-weight-semibold)',
            letterSpacing: 'var(--letter-spacing-card-title)',
          },
        ],
        body: [
          'var(--font-size-body)',
          {
            lineHeight: 'var(--line-height-body)',
            fontWeight: 'var(--font-weight-regular)',
            letterSpacing: 'var(--letter-spacing-body)',
          },
        ],
        'body-strong': [
          'var(--font-size-body)',
          {
            lineHeight: 'var(--line-height-body)',
            fontWeight: 'var(--font-weight-semibold)',
            letterSpacing: 'var(--letter-spacing-body)',
          },
        ],
        label: [
          'var(--font-size-label)',
          {
            lineHeight: 'var(--line-height-body)',
            fontWeight: 'var(--font-weight-semibold)',
            letterSpacing: 'var(--letter-spacing-label)',
          },
        ],
        caption: [
          'var(--font-size-caption)',
          {
            lineHeight: 'var(--line-height-body)',
            fontWeight: 'var(--font-weight-regular)',
            letterSpacing: 'var(--letter-spacing-body)',
          },
        ],
        badge: [
          'var(--font-size-badge)',
          {
            lineHeight: '1',
            fontWeight: 'var(--font-weight-semibold)',
            letterSpacing: 'var(--letter-spacing-badge)',
          },
        ],
      },
      transitionDuration: {
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
      },
      transitionTimingFunction: {
        ease: 'var(--ease-default)',
      },
    },
  },
  plugins: [],
};

export default config;
