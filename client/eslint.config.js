import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist/'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // react-three-fiber renders host elements (mesh, instancedMesh, sphereGeometry, ...)
    // that aren't real DOM tags, so react/no-unknown-property false-positives on every
    // three.js prop (args, position, intensity, vertexColors, ...) they carry.
    files: ['**/components/NeighborhoodMap.jsx'],
    rules: {
      'react/no-unknown-property': 'off',
    },
  },
];
