import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          hover: "var(--primary-hover)",
          light: "var(--primary-light)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
          light: "var(--destructive-light)",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
          light: "var(--success-light)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          foreground: "var(--warning-foreground)",
          light: "var(--warning-light)",
        },
        /* Magnus Copo Brand Colors */
        brand: {
          900: "var(--brand-900)",
          700: "var(--brand-700)",
          600: "var(--brand-600)",
          500: "var(--brand-500)",
          400: "var(--brand-400)",
          300: "var(--brand-300)",
          200: "var(--brand-200)",
          100: "var(--brand-100)",
          50: "var(--brand-50)",
        },
        /* Semantic Attention Colors */
        gold: {
          DEFAULT: "var(--accent-gold)",
          light: "var(--accent-gold-light)",
          foreground: "var(--accent-gold-foreground)",
        },
        coral: {
          DEFAULT: "var(--accent-warm)",
          light: "var(--accent-warm-light)",
          foreground: "var(--accent-warm-foreground)",
        },
        pending: {
          DEFAULT: "var(--pending)",
          light: "var(--pending-light)",
          foreground: "var(--pending-foreground)",
        },
        ops: {
          sky: "#0f4cff",
          cyan: "#00a6c7",
          coral: "#ff7a59",
          amber: "#ffd166",
          night: "#172554",
        },
        /* Neutral Greys */
        neutral: {
          50: "var(--neutral-50)",
          100: "var(--neutral-100)",
          200: "var(--neutral-200)",
          300: "var(--neutral-300)",
          400: "var(--neutral-400)",
          500: "var(--neutral-500)",
          600: "var(--neutral-600)",
          700: "var(--neutral-700)",
          800: "var(--neutral-800)",
          900: "var(--neutral-900)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      /* Design System 2.0 Extensions */
      spacing: {
        "1": "var(--space-1)",
        "2": "var(--space-2)",
        "3": "var(--space-3)",
        "4": "var(--space-4)",
        "5": "var(--space-5)",
        "6": "var(--space-6)",
        "8": "var(--space-8)",
        "10": "var(--space-10)",
        "12": "var(--space-12)",
        "16": "var(--space-16)",
        "20": "var(--space-20)",
        "24": "var(--space-24)",
      },
      transitionDuration: {
        instant: "var(--duration-instant)",
        micro: "var(--duration-micro)",
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        normal: "var(--duration-normal)",
        slow: "var(--duration-slow)",
        slower: "var(--duration-slower)",
      },
      transitionTimingFunction: {
        "out-expo": "var(--ease-out-expo)",
        spring: "var(--ease-spring)",
        "in-out-quad": "var(--ease-in-out-quad)",
        bounce: "var(--ease-bounce)",
        premium: "var(--ease-premium)",
        /* Enterprise Standard Curves */
        standard: "cubic-bezier(0.4, 0, 0.2, 1)",
        enter: "cubic-bezier(0, 0, 0.2, 1)",
        exit: "cubic-bezier(0.4, 0, 1, 1)",
      },
      backgroundImage: {
        /* MagnusCopo Brand Gradients */
        "gradient-brand": "var(--gradient-brand)",
        "gradient-primary": "var(--gradient-primary)",
        "gradient-gold": "var(--gradient-gold)",
        "gradient-coral": "var(--gradient-coral)",
        /* Glassmorphism */
        glass: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)",
        "glass-strong": "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
        "glass-subtle": "linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.6) 100%)",
        "glass-sidebar": "linear-gradient(180deg, rgba(250,250,249,0.8) 0%, rgba(245,245,244,0.9) 100%)",
        "shimmer": "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
        "ops-aurora": "radial-gradient(circle at 15% 15%, rgba(15, 76, 255, 0.18) 0%, transparent 55%), radial-gradient(circle at 82% 18%, rgba(0, 166, 199, 0.14) 0%, transparent 48%), radial-gradient(circle at 52% 88%, rgba(255, 122, 89, 0.12) 0%, transparent 56%)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        inner: "var(--shadow-inner)",
        "glow-primary": "var(--shadow-glow-primary)",
        "glow-brand": "var(--shadow-glow-brand)",
        "glow-gold": "var(--shadow-glow-gold)",
        "glow-coral": "var(--shadow-glow-coral)",
        "glow-accent": "var(--shadow-glow-accent)",
        "glow-primary-lg": "var(--shadow-glow-primary-lg)",
        "glow-accent-lg": "var(--shadow-glow-accent-lg)",
        "card-hover": "var(--shadow-card-hover)",
        /* Light Mode Glassmorphism Shadows */
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.05)",
        "glass-lg": "0 12px 40px -4px rgba(0, 0, 0, 0.08)",
        floating: "0 20px 40px -10px rgba(0, 0, 0, 0.1)",
        "floating-xl": "0 25px 50px -12px rgba(0, 0, 0, 0.12)",
        "panel-left": "-10px 0 30px -10px rgba(0, 0, 0, 0.1)",
        "panel-right": "10px 0 30px -10px rgba(0, 0, 0, 0.1)",
        lift: "0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)",
      },
      fontSize: {
        xs: ["var(--font-size-xs)", { lineHeight: "var(--line-height-normal)" }],
        sm: ["var(--font-size-sm)", { lineHeight: "var(--line-height-normal)" }],
        base: ["var(--font-size-base)", { lineHeight: "var(--line-height-normal)" }],
        lg: ["var(--font-size-lg)", { lineHeight: "var(--line-height-normal)" }],
        xl: ["var(--font-size-xl)", { lineHeight: "var(--line-height-snug)" }],
        "2xl": ["var(--font-size-2xl)", { lineHeight: "var(--line-height-snug)" }],
        "3xl": ["var(--font-size-3xl)", { lineHeight: "var(--line-height-tight)" }],
        "4xl": ["var(--font-size-4xl)", { lineHeight: "var(--line-height-tight)" }],
        "5xl": ["var(--font-size-5xl)", { lineHeight: "var(--line-height-tight)" }],
        display: ["var(--font-size-display)", { lineHeight: "var(--line-height-tight)", letterSpacing: "var(--letter-spacing-tight)" }],
        heading: ["var(--font-size-heading)", { lineHeight: "var(--line-height-tight)", letterSpacing: "var(--letter-spacing-tight)" }],
      },
      letterSpacing: {
        tighter: "var(--letter-spacing-tighter)",
        tight: "var(--letter-spacing-tight)",
        normal: "var(--letter-spacing-normal)",
        wide: "var(--letter-spacing-wide)",
        wider: "var(--letter-spacing-wider)",
      },
      lineHeight: {
        tight: "var(--line-height-tight)",
        snug: "var(--line-height-snug)",
        normal: "var(--line-height-normal)",
        relaxed: "var(--line-height-relaxed)",
      },
      zIndex: {
        dropdown: "var(--z-index-dropdown)",
        sticky: "var(--z-index-sticky)",
        fixed: "var(--z-index-fixed)",
        "modal-backdrop": "var(--z-index-modal-backdrop)",
        modal: "var(--z-index-modal)",
        popover: "var(--z-index-popover)",
        tooltip: "var(--z-index-tooltip)",
      },
      maxWidth: {
        xs: "var(--container-xs)",
        sm: "var(--container-sm)",
        md: "var(--container-md)",
        lg: "var(--container-lg)",
        xl: "var(--container-xl)",
        "2xl": "var(--container-2xl)",
        "3xl": "var(--container-3xl)",
        "4xl": "var(--container-4xl)",
        "5xl": "var(--container-5xl)",
        "6xl": "var(--container-6xl)",
        "7xl": "var(--container-7xl)",
      },
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        DEFAULT: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "40px",
        "3xl": "64px",
      },
      keyframes: {
        "ops-float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "ops-gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "ops-enter-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0px)" },
        },
      },
      animation: {
        "ops-float": "ops-float 6s ease-in-out infinite",
        "ops-gradient-shift": "ops-gradient-shift 14s ease infinite",
        "ops-enter-up": "ops-enter-up 420ms cubic-bezier(0.2, 0.85, 0.25, 1) both",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // Container queries plugin support (install via: npm install @tailwindcss/container-queries)
    // Graceful fallback if not installed
    ...((() => {
      try {
        return [require("@tailwindcss/container-queries")];
      } catch {
        console.warn("@tailwindcss/container-queries not installed. Container query utilities will be limited.");
        return [];
      }
    })()),
  ],
};
export default config;
