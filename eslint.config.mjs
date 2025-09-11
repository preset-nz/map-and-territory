import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Apply Next + TS configs only to source code under src/
const base = compat
  .extends("next/core-web-vitals", "next/typescript")
  .map((cfg) => ({
    ...cfg,
    files: ["src/**/*.{js,jsx,ts,tsx}"],
  }));

const eslintConfig = [
  ...base,
  // Global ignores to keep lint focused
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "public/**",
      "coverage/**",
      "playwright-report/**",
      "guidance/**",
      "scripts/**",
      "next-env.d.ts",
      "**/*.md",
      "**/*.mdx",
    ],
  },
  // Relaxed rules for test files
  {
    files: ["src/test/**/*.{ts,tsx}", "src/test/**/*.ts"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        vi: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
    rules: {
      "no-console": "off",
      "react/display-name": "off",
      "react/jsx-key": "off",
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
