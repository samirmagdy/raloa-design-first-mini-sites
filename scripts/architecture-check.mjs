#!/usr/bin/env node
/**
 * Backend-readiness gate. Each rule protects a seam that a real HTTP repository has to plug into
 * without touching screens, so a violation here means "this code cannot be swapped, only rewritten".
 *
 * A. Only the services layer may import the concrete mock repository.
 * B. Only the storage layer may touch the domain database key.
 * C. Product screens read through the repository, never the static content fixtures.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

const SOURCE_IMPORT = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/g;

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (entry === 'node_modules' || entry.startsWith('.')) return [];
    return statSync(path).isDirectory() ? walk(path) : /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });

/** Repo-relative posix path, e.g. `src/components/studio/StudioShell.tsx`. */
const projectPath = (absolute) => relative(ROOT, absolute).split(sep).join(posix.sep);

const importsOf = (absolute) => {
  const source = readFileSync(absolute, 'utf8');
  const resolved = [];
  for (const [, specifier] of source.matchAll(SOURCE_IMPORT)) {
    if (!specifier.startsWith('.')) continue;
    const target = posix.normalize(posix.join(posix.dirname(projectPath(absolute)), specifier));
    resolved.push({ specifier, target });
  }
  return resolved;
};

const lineOf = (absolute, needle) =>
  readFileSync(absolute, 'utf8').split('\n').findIndex((line) => line.includes(needle)) + 1;

const PRODUCT_SCREENS = [
  'src/components/studio/',
  'src/components/profile/',
  'src/components/SettingsPage.tsx',
  'src/components/AnalyticsPage.tsx',
  'src/components/ImportPage.tsx',
  'src/components/OnboardingPage.tsx',
  'src/components/AuthPage.tsx',
  'src/components/PublicProfilePage.tsx'
];

const violations = [];

for (const file of walk(SRC)) {
  const path = projectPath(file);
  if (path.endsWith('.d.ts')) continue;

  for (const { specifier, target } of importsOf(file)) {
    if (target.startsWith('src/services/mock/') && !path.startsWith('src/services/')) {
      violations.push({ file: path, line: lineOf(file, specifier), rule: 'A', detail: `imports the concrete mock repository ('${specifier}')` });
    }
    if (PRODUCT_SCREENS.some((screen) => path.startsWith(screen)) && target === 'src/data/content') {
      violations.push({ file: path, line: lineOf(file, specifier), rule: 'C', detail: `product screen reads static fixtures ('${specifier}') instead of repository.*` });
    }
  }

  const source = readFileSync(file, 'utf8');
  const dbKey = source.match(/['"`]raloa\.db/);
  if (dbKey && !path.startsWith('src/services/storage/')) {
    violations.push({ file: path, line: lineOf(file, 'raloa.db'), rule: 'B', detail: `references the domain database key ('${dbKey[0].slice(1)}…') outside the storage layer` });
  }
}

if (violations.length) {
  console.error(`architecture check failed — ${violations.length} violation(s)\n`);
  for (const violation of violations) {
    console.error(`  [${violation.rule}] ${violation.file}:${violation.line} — ${violation.detail}`);
  }
  console.error('\nRules:\n  A  only src/services/** may import the mock repository; screens use useRepository()\n  B  only src/services/storage/** may name the domain database key\n  C  product screens read domain data through the repository, not src/data fixtures');
  process.exit(1);
}

console.log('architecture check passed — repository seam intact');
