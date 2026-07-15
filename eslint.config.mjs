import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import { defineConfig } from 'eslint/config';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
  },
]);

export default eslintConfig;
