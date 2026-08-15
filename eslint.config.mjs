import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * ESLint flat config.
 *
 * `next lint` was removed in Next.js 16 and eslint-config-next now
 * requires ESLint >= 9. As of v16 the config ships native flat-config
 * exports, so FlatCompat is not needed — import the shareable configs
 * directly.
 */
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  ...coreWebVitals,
  ...typescript,
];

export default config;
