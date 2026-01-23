import pluginNext from "@next/eslint-plugin-next";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginJsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "dist/**",
      ".auto-claude/**",
      "fix-mobile.js",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": pluginNext,
      "react": pluginReact,
      "react-hooks": pluginReactHooks,
      "jsx-a11y": pluginJsxA11y,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs["core-web-vitals"].rules,
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/no-unknown-property": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "prefer-const": "warn",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];
