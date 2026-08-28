import nextVitals from "eslint-config-next";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";

const RULE_OVERRIDES = {
  "react-hooks/set-state-in-effect": "warn",
  "react-hooks/exhaustive-deps": "warn",
  "@next/next/no-img-element": "warn",
  "@next/next/no-location-assign-relative-destination": "warn",
  "react/no-unescaped-entities": ["warn", { "forbid": ["'"] }],
  "jsx-a11y/alt-text": "warn",
};

export default [
  ...nextVitals.map((cfg) => ({
    ...cfg,
    plugins: {
      ...(cfg.plugins || {}),
      import: importPlugin,
      "jsx-a11y": jsxA11y,
      react,
      "react-hooks": reactHooks,
      "@next/next": nextPlugin,
    },
    rules: {
      ...(cfg.rules || {}),
      ...RULE_OVERRIDES,
    },
  })),
  { ignores: [".next/**", "out/**", "node_modules/**"] },
];
