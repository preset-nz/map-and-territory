#!/usr/bin/env node
 
import { execSync } from 'node:child_process';
import { statSync, readFileSync } from 'node:fs';

const RED = '\u001b[31m';
const GREEN = '\u001b[32m';
const YELLOW = '\u001b[33m';
const RESET = '\u001b[0m';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function getStagedFiles() {
  const out = execSync('git diff --cached --name-only --diff-filter=ACMR -z', { encoding: 'buffer' });
  const parts = out.toString('utf8').split('\u0000').filter(Boolean);
  return parts;
}

function main() {
  console.log(`${YELLOW}pre-commit: running checks...${RESET}`);

  // 1) Block commits directly to main
  const branch = sh('git rev-parse --abbrev-ref HEAD');
  if (branch === 'main') {
    console.error(`${RED}Blocked: committing directly to 'main' is disabled. Create a branch and PR.${RESET}`);
    process.exit(1);
  }

  const staged = getStagedFiles();
  if (staged.length === 0) {
    console.log(`${GREEN}No staged files to check.${RESET}`);
    process.exit(0);
  }

  // 2) Large file guard (10MB)
  const threshold = 10 * 1024 * 1024;
  const large = [];
  for (const f of staged) {
    try {
      const s = statSync(f);
      if (s.isFile() && s.size >= threshold) {
        large.push(`${f} (${s.size} bytes)`);
      }
    } catch {}
  }
  if (large.length > 0) {
    console.error(`${RED}Blocked: staged files exceed 10MB:${RESET}`);
    for (const l of large) console.error(` - ${l}`);
    console.error('Consider using Git LFS or excluding these files.');
    process.exit(1);
  }

  // 3) CRLF detection on common text files
  const TEXT_EXTS = new Set(['js','jsx','ts','tsx','mjs','cjs','json','css','scss','md','mdx','yml','yaml','html','svg']);
  const crlf = [];
  for (const f of staged) {
    const ext = f.includes('.') ? f.split('.').pop() : '';
    if (!TEXT_EXTS.has(ext)) continue;
    try {
      const buf = readFileSync(f);
      if (buf.includes(0x0d)) {
        // Quick check: contains carriage return; flag as CRLF risk
        crlf.push(f);
      }
    } catch {}
  }
  if (crlf.length > 0) {
    console.error(`${RED}CRLF detected in:${RESET}`);
    for (const f of crlf) console.error(` - ${f}`);
    console.error("Please convert to LF line endings (e.g., 'git config core.autocrlf input'), reformat, and re-stage.");
    process.exit(1);
  }

  console.log(`${GREEN}pre-commit: basic checks passed.${RESET}`);
}

try {
  main();
} catch (e) {
  console.error(`${RED}pre-commit error:${RESET} ${(e && e.message) || e}`);
  process.exit(1);
}

