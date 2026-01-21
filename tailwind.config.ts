import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Цвета панелей (гибрид)
        dispatcher: {
          light: '#3b82f6',
          DEFAULT: '#2563eb',
          dark: '#1e40af',
        },
        zamporab: {
          light: '#8b5cf6',
          DEFAULT: '#7c3aed',
          dark: '#6d28d9',
        },
        master: {
          light: '#10b981',
          DEFAULT: '#059669',
          dark: '#047857',
        },
        service: {
          light: '#a16207',
          DEFAULT: '#854d0e',
          dark: '#713f12',
        },
        boss: {
          light: '#b91c1c',
          DEFAULT: '#991b1b',
          dark: '#7f1d1d',
        },
        transport: {
          light: '#65a30d',
          DEFAULT: '#4d7c0f',
          dark: '#3f6212',
        },
        complaints: {
          light: '#7e22ce',
          DEFAULT: '#6b21a8',
          dark: '#581c87',
        },
        admin: {
          light: '#4b5563',
          DEFAULT: '#374151',
          dark: '#1f2937',
        },
        
        // Цвета служб
        service: {
          str: {
            light: '#a855f7',
            DEFAULT: '#9333ea',
            dark: '#7e22ce',
          },
          eng: {
            light: '#facc15',
            DEFAULT: '#eab308',
            dark: '#ca8a04',
          },
          fire: {
            light: '#f87171',
            DEFAULT: '#ef4444',
            dark: '#dc2626',
          },
          vent: {
            light: '#2dd4bf',
            DEFAULT: '#14b8a6',
            dark: '#0d9488',
          },
          cctv: {
            light: '#4ade80',
            DEFAULT: '#22c55e',
            dark: '#16a34a',
          },
        },
      },
      animation: {
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'count-up': 'countUp 0.8s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        countUp: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};

export default config;
