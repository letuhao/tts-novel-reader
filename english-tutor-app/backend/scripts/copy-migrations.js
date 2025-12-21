/**
 * Copy migration SQL files to dist directory
 */
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcMigrationsDir = join(__dirname, '..', 'src', 'database', 'migrations');
const distMigrationsDir = join(__dirname, '..', 'dist', 'database', 'migrations');

// Create dist migrations directory
mkdirSync(distMigrationsDir, { recursive: true });

// Copy all SQL files
const files = readdirSync(srcMigrationsDir);
for (const file of files) {
  if (file.endsWith('.sql')) {
    const srcPath = join(srcMigrationsDir, file);
    const distPath = join(distMigrationsDir, file);
    copyFileSync(srcPath, distPath);
    console.log(`Copied ${file} to dist`);
  }
}

console.log('Migration files copied successfully');

