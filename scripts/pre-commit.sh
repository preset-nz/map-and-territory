#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${YELLOW}pre-commit: running branch/size/line-ending checks...${NC}"

# 1) Block commits directly to main
branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$branch" == "main" ]]; then
  echo -e "${RED}Blocked: committing directly to 'main' is disabled. Create a branch and PR.${NC}"
  exit 1
fi

# Collect staged files (added/copied/modified/renamed, not deleted)
mapfile -d '' STAGED < <(git diff --cached --name-only --diff-filter=ACMR -z)
if [[ ${#STAGED[@]} -eq 0 ]]; then
  echo -e "${GREEN}No staged files to check.${NC}"
  exit 0
fi

# 2) Large file guard (10MB)
threshold=$((10 * 1024 * 1024))
large_files=()
for f in "${STAGED[@]}"; do
  if [[ -f "$f" ]]; then
    size=$(wc -c <"$f" | tr -d ' ')
    if [[ "$size" -ge "$threshold" ]]; then
      large_files+=("$f ($size bytes)")
    fi
  fi
done
if [[ ${#large_files[@]} -gt 0 ]]; then
  echo -e "${RED}Blocked: staged files exceed 10MB:${NC}"
  printf ' - %s\n' "${large_files[@]}"
  echo "Consider using Git LFS or excluding these files."
  exit 1
fi

# 3) Line ending check (CRLF) on common text files
TEXT_EXTS=(js jsx ts tsx mjs cjs json css scss md mdx yml yaml html svg)
crlf_found=false
for f in "${STAGED[@]}"; do
  for e in "${TEXT_EXTS[@]}"; do
    if [[ "$f" == *.$e && -f "$f" ]]; then
      if grep -q $'\r' "$f"; then
        echo -e "${RED}CRLF detected:${NC} $f"
        crlf_found=true
      fi
      break
    fi
  done
done
if [[ "$crlf_found" == true ]]; then
  echo "Please convert to LF line endings (e.g., 'git config core.autocrlf input'), reformat, and re-stage."
  exit 1
fi

echo -e "${GREEN}pre-commit: basic checks passed.${NC}"

