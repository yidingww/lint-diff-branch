import antfu from '@antfu/eslint-config';

export default antfu({
  formatters: true,
  type: 'lib',
  stylistic: { semi: true },
  typescript: {
    tsconfigPath: 'tsconfig.json',
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.?([cm])[jt]s'],
      },
    },
  },
}, {
  rules: {
    'no-console': 'off',
  },
});
