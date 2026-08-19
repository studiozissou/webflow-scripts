import js from '@eslint/js';
import globals from 'globals';

/**
 * Minimal, high-signal config: correctness only, no style rules.
 * Formatting is prettier's job (`npm run format -- <path>`).
 */

const NODE_FILES = [
  'tools/**/*.js',
  'scripts/**/*.js',
  'tests/**/*.js',
  'projects/*/tests/**/*.js',
  'projects/*/serve-*.js',
  // Node automation that lives inside a project folder.
  'projects/zissou-archive/**/*.js',
  '**/*.config.js',
  '**/*.spec.js',
  '**/*.test.js',
];

const shared = {
  ...js.configs.recommended.rules,
  'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  // Empty catch blocks are a deliberate pattern in this codebase's defensive code.
  'no-empty': ['error', { allowEmptyCatch: true }],
  // Sloppy rather than broken — worth seeing, not worth blocking.
  'preserve-caught-error': 'warn',
};

export default [
  {
    ignores: [
      'node_modules/**',
      '.claude/worktrees/**',
      'projects/*/dist/**',
      'projects/*/rollback/**',
      '**/*.min.js',
      // Webflow embed snippets: HTML + <script> tags saved with a .js extension.
      // Not parseable as JavaScript — see note in the repo docs.
      'projects/carsa/filter-submit-fix.js',
      'projects/carsa/homepage.js',
      'projects/carsa/make-model-redirect.js',
      'projects/carsa/make-model.old.js',
      'projects/carsa/near-location-redirect.js',
      'projects/coconut/snippets/thetimes-utm.js',
      'projects/coconut/snippets/times-cookie-overwrite.js',
    ],
  },

  // Browser runtime: vanilla ES2022 modules loaded from the CDN.
  {
    files: ['projects/**/*.js'],
    ignores: NODE_FILES,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // CDN-loaded libraries — present at runtime, never imported.
        gsap: 'readonly',
        ScrollTrigger: 'readonly',
        SplitText: 'readonly',
        barba: 'readonly',
        Lenis: 'readonly',
        Swiper: 'readonly',
        lottie: 'readonly',
        Webflow: 'readonly',
        jQuery: 'readonly',
        $: 'readonly',
        RHP: 'readonly',
      },
    },
    rules: {
      ...shared,
      // Bug-catchers for hand-written browser JS with no type checking.
      eqeqeq: ['warn', 'smart'],
      'no-implicit-globals': 'error',
      'no-constant-binary-expression': 'error',
      'no-self-compare': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-promise-executor-return': 'warn',
    },
  },

  // Node tooling and Playwright specs. These get browser globals too, because
  // page.evaluate() callbacks are DOM code living inside Node test files.
  {
    files: NODE_FILES,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: shared,
  },
];
