import type {Config} from 'tailwindcss';

/**
 * Monday.com-Inspired Design System Configuration
 * ================================================
 * 
 * This Tailwind config extends the base design tokens with a comprehensive
 * design system inspired by Monday.com's clean, modern SaaS aesthetic.
 * 
 * Key Features:
 * - Bright but tasteful colors with semantic naming
 * - Responsive typography scale (mobile-first)
 * - Consistent spacing and radius tokens
 * - Elevation system with soft shadows
 * - Status color variants for chips/tags
 * 
 * All existing tokens are preserved for backward compatibility.
 */

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* ========================================
         TYPOGRAPHY - Mobile-First Scale
         ======================================== */
      fontFamily: {
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        headline: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        code: ['JetBrains Mono', 'Monaco', 'monospace'],
      },
      fontSize: {
        // Mobile-first base sizes (optimized for 375px)
        'xs': ['0.75rem', { lineHeight: '1rem' }], // 12px - captions
        'sm': ['0.875rem', { lineHeight: '1.25rem' }], // 14px - small text
        'base': ['1rem', { lineHeight: '1.5rem' }], // 16px - body text
        'lg': ['1.125rem', { lineHeight: '1.75rem' }], // 18px - emphasized
        'xl': ['1.25rem', { lineHeight: '1.75rem' }], // 20px - small headings
        '2xl': ['1.5rem', { lineHeight: '2rem' }], // 24px - section headings
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px - page titles
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px - hero text
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },

      /* ========================================
         COLOR SYSTEM - Extended Palette
         ======================================== */
      colors: {
        // Existing tokens (preserved for compatibility)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },

        // NEW: Status colors for trip/item states (Monday.com style)
        status: {
          upcoming: 'hsl(var(--status-upcoming))',
          'in-progress': 'hsl(var(--status-in-progress))',
          completed: 'hsl(var(--status-completed))',
          'on-hold': 'hsl(var(--status-on-hold))',
        },

        // NEW: Semantic colors with background variants
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          bg: 'hsl(var(--success-bg))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          bg: 'hsl(var(--warning-bg))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
          bg: 'hsl(var(--info-bg))',
        },
        danger: {
          DEFAULT: 'hsl(var(--danger))',
          foreground: 'hsl(var(--danger-foreground))',
          bg: 'hsl(var(--danger-bg))',
        },

        // Extended neutral grays for fine-tuned control
        gray: {
          50: 'hsl(0 0% 98%)',
          100: 'hsl(0 0% 96%)',
          200: 'hsl(0 0% 90%)',
          300: 'hsl(0 0% 85%)',
          400: 'hsl(0 0% 65%)',
          500: 'hsl(0 0% 45%)',
          600: 'hsl(0 0% 35%)',
          700: 'hsl(0 0% 25%)',
          800: 'hsl(0 0% 15%)',
          900: 'hsl(0 0% 9%)',
        },
      },

      /* ========================================
         BORDER RADIUS - Rounded Corners
         ======================================== */
      borderRadius: {
        // Existing (preserved)
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // NEW: Extended radius scale
        'xs': 'var(--radius-sm)', // 4px - subtle
        'base': 'var(--radius-md)', // 6px - default
        'xl': 'var(--radius-xl)', // 12px - prominent
        'full': '9999px', // Pills/circles
      },

      /* ========================================
         SPACING SCALE - Monday.com Rhythm
         ======================================== */
      spacing: {
        // Extend default scale with design system tokens
        'xs': 'var(--space-xs)', // 4px
        'sm': 'var(--space-sm)', // 8px
        'md': 'var(--space-md)', // 16px
        'lg': 'var(--space-lg)', // 24px
        'xl': 'var(--space-xl)', // 32px
        '2xl': 'var(--space-2xl)', // 48px
      },

      /* ========================================
         SHADOWS - Elevation System
         ======================================== */
      boxShadow: {
        // Existing shadows preserved
        'sm': 'var(--shadow-sm)',
        'DEFAULT': 'var(--shadow-md)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        // Monday.com-style soft shadows
        'monday-sm': '0 1px 3px 0 rgb(0 0 0 / 0.08)',
        'monday-md': '0 2px 8px 0 rgb(0 0 0 / 0.12)',
        'monday-lg': '0 4px 16px 0 rgb(0 0 0 / 0.16)',
      },

      /* ========================================
         ANIMATIONS & TRANSITIONS
         ======================================== */
      transitionDuration: {
        'fast': '150ms',
        'base': '200ms',
        'slow': '300ms',
      },
      transitionTimingFunction: {
        'monday': 'cubic-bezier(0.4, 0.0, 0.2, 1)', // Monday.com easing
      },

      /* ========================================
         KEYFRAMES & ANIMATIONS
         ======================================== */
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        // Monday.com-style fade in
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-out': {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(4px)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.2s ease-out',
      },

      /* ========================================
         BREAKPOINTS - Mobile-First
         ======================================== */
      screens: {
        'xs': '375px', // Small phones
        'sm': '640px', // Large phones / small tablets
        'md': '768px', // Tablets
        'lg': '1024px', // Desktop
        'xl': '1280px', // Large desktop
        '2xl': '1536px', // Extra large desktop
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;