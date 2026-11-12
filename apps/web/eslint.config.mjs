import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // API route handlers are server endpoints (GET, POST, etc.) rather than React components.
    // They may use JSX via ImageResponse (from next/og), but standard React component rules
    // (such as error-boundaries or purity) do not apply to server HTTP handlers.
    files: ["src/app/api/**/*", "app/api/**/*"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/error-boundaries": "off",
      "react-hooks/purity": "off",
    },
  },
]);

export default eslintConfig;
