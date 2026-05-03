import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  // Ignore patterns FIRST
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/backstop_data/**",
      "**/test-results/**",
      "Design Leads Page_new/**",
      "**/*.d.ts",
      "**/*.config.js",
      "**/*.config.mjs",
      "**/*.config.ts",
      "**/next-env.d.ts",
      "**/components/ui/**",
      "**/*.min.js",
      "**/*bundle*.js",
      "**/venv/**",
    ],
  },
  // JavaScript recommended rules
  js.configs.recommended,
  // TypeScript recommended rules
  ...tseslint.configs.recommended,
  // Custom overrides for project files
  {
    files: [
      "app/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "lib/**/*.{ts,tsx}",
      "hooks/**/*.{ts,tsx}",
      "types/**/*.{ts,tsx}",
      "scripts/**/*.{ts,tsx}",
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        React: "readonly",
        JSX: "readonly",
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // Turn OFF overly strict rules
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-wrapper-object-types": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off",
      "no-unused-vars": "off",
    },
  }
);
