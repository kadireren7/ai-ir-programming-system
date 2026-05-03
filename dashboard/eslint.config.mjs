import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // react-hooks v7 introduced this rule but it flags the common async-load-in-effect pattern.
      // Disabling until the codebase can be incrementally migrated.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
