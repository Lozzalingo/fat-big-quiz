/**
 * Fat Big Quiz -- Module-level tests
 *
 * Verifies that every module under server/modules/ exports the expected
 * interface (registerRoutes function + services array) and can be
 * required without throwing.
 *
 * Run:  node --test server/modules/__tests__/modules.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const MODULE_NAMES = [
  'admin',
  'blog',
  'events',
  'hire',
  'quiz-app',
  'quiz-database',
  'quiz-pack',
  'sales',
  'shop',
];

const modulesDir = path.resolve(__dirname, '..');

describe('Fat Big Quiz modules', () => {
  for (const name of MODULE_NAMES) {
    describe(name, () => {
      let mod;

      it('can be required without errors', () => {
        mod = require(path.join(modulesDir, name));
        assert.ok(mod, `Module "${name}" should export a truthy value`);
      });

      it('exports a registerRoutes function', () => {
        mod = mod || require(path.join(modulesDir, name));
        assert.equal(
          typeof mod.registerRoutes,
          'function',
          `${name}.registerRoutes should be a function`,
        );
      });

      it('exports a services array of strings', () => {
        mod = mod || require(path.join(modulesDir, name));
        assert.ok(
          Array.isArray(mod.services),
          `${name}.services should be an array`,
        );
        for (const svc of mod.services) {
          assert.equal(
            typeof svc,
            'string',
            `Every entry in ${name}.services should be a string, got ${typeof svc}`,
          );
        }
      });
    });
  }
});
