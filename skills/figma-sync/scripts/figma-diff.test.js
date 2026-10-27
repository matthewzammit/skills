// Run with: node --test skills/figma-sync/scripts/*.test.js (or just `node --test` in this folder)
const test = require('node:test');
const assert = require('node:assert');
const cfg = require('./figma-sync.config.example.js');
const { sectionsFor, sectionsForFiles, routesWithoutSection, parseSyncRecord, allSections } = require('./figma-diff.js');

test('maps a screen to the section that draws it', () => {
  assert.deepStrictEqual(sectionsFor('src/app/(auth)/login.tsx', cfg), ['Sign in']);
  assert.deepStrictEqual(sectionsFor('src/features/home/HomeHero.tsx', cfg), ['Home']);
  assert.deepStrictEqual(sectionsFor('src/app/team/[id].tsx', cfg), ['Team: list', 'Team: member detail']);
});

test('the first matching rule wins (narrow above broad)', () => {
  assert.deepStrictEqual(sectionsFor('src/app/settings/billing/plans.tsx', cfg), ['Billing']);
  assert.deepStrictEqual(sectionsFor('src/app/settings/profile.tsx', cfg), ['Settings']);
  assert.deepStrictEqual(sectionsFor('src/app/settings.tsx', cfg), ['Settings']);
});

test('an ignored file returns an empty list', () => {
  assert.deepStrictEqual(sectionsFor('src/app/lab/colors.tsx', cfg), []);
  assert.deepStrictEqual(sectionsFor('src/app/_layout.tsx', cfg), []);
  assert.deepStrictEqual(sectionsFor('src/features/home/HomeHero.test.tsx', cfg), []);
});

test('a file no rule knows returns null', () => {
  assert.strictEqual(sectionsFor('src/app/brand-new-page.tsx', cfg), null);
});

test('a shared component or token maps to the design system section', () => {
  assert.deepStrictEqual(sectionsFor('src/components/ui/Button.tsx', cfg), [cfg.designSystem]);
  assert.deepStrictEqual(sectionsFor('src/theme/tokens.ts', cfg), [cfg.designSystem]);
});

test('sectionsForFiles groups by section, skips non-UI files and lists unmapped ones', () => {
  const { sections, unmapped } = sectionsForFiles([
    'src/app/(tabs)/home.tsx',
    'src/features/home/HomeHero.tsx',
    'src/lib/dates.ts',
    'docs/home.md',
    'src/features/billing/PlanCard.tsx',
    'src/app/brand-new-page.tsx',
    'src/app/lab/colors.tsx',
  ], cfg);
  assert.deepStrictEqual(sections.get('Home'), ['src/app/(tabs)/home.tsx', 'src/features/home/HomeHero.tsx']);
  assert.deepStrictEqual(sections.get('Billing'), ['src/features/billing/PlanCard.tsx']);
  assert.strictEqual(sections.size, 2);
  assert.deepStrictEqual(unmapped, ['src/app/brand-new-page.tsx']);
});

test('routesWithoutSection lists screens no section covers', () => {
  const routes = ['src/app/settings.tsx', 'src/app/new-thing.tsx', 'src/app/lab/index.tsx', 'src/lib/x.ts'];
  assert.deepStrictEqual(routesWithoutSection(routes, cfg), ['src/app/new-thing.tsx']);
});

test('allSections lists every section once, without the design system', () => {
  const all = allSections(cfg);
  assert.strictEqual(new Set(all).size, all.length);
  assert.ok(all.includes('Sign in'));
  assert.ok(!all.includes(cfg.designSystem));
});

test('parseSyncRecord reads a valid record', () => {
  assert.strictEqual(parseSyncRecord('{"lastSyncedCommit":"09efeb58","syncedAt":"2026-10-16"}').lastSyncedCommit, '09efeb58');
});

test('parseSyncRecord rejects a bad sha and a bad date', () => {
  assert.throws(() => parseSyncRecord('{"lastSyncedCommit":"main","syncedAt":"2026-10-16"}'), /sha/);
  assert.throws(() => parseSyncRecord('{"lastSyncedCommit":"09efeb58","syncedAt":"16/10"}'), /YYYY-MM-DD/);
});
