#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '..', '..');
const templatesDir = join(packageRoot, 'templates');

const target = process.argv[2] ?? process.cwd();

if (!existsSync(templatesDir)) {
  console.error('Templates not found. Run from the backend-blueprint package.');
  process.exit(1);
}

function copyRecursive(src: string, dest: string) {
  cpSync(src, dest, { recursive: true });
}

const dirs = ['app/api', 'app/admin', 'prisma/schema'];
for (const d of dirs) {
  mkdirSync(join(target, d), { recursive: true });
}

copyRecursive(join(templatesDir, 'app'), join(target, 'app'));
copyRecursive(join(templatesDir, 'prisma'), join(target, 'prisma'));

const envExample = join(packageRoot, 'deploy', '.env.example');
if (existsSync(envExample)) {
  const destEnv = join(target, '.env.backend-blueprint.example');
  if (!existsSync(destEnv)) {
    copyRecursive(envExample, destEnv);
  }
}

const middlewareSrc = join(templatesDir, 'middleware.ts');
if (existsSync(middlewareSrc)) {
  writeFileSync(join(target, 'middleware.ts'), readFileSync(middlewareSrc, 'utf8'));
}

console.log('backend-blueprint init complete.');
console.log('Next steps:');
console.log('  1. Merge prisma/schema/*.prisma from the package into your own prisma/schema');
console.log('  2. npm install backend-blueprint @prisma/client next-auth');
console.log('  3. Set DATABASE_URL, NEXTAUTH_SECRET in .env');
console.log('  4. npx prisma migrate dev');
