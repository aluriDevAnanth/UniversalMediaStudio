#!/usr/bin/env bash
# ==============================================================================
# UniversalMediaStudio - POSIX Startup & Environment Setup Script
# Usage: ./scripts/startup.sh [--clean] [--build] [--check-only]
# ==============================================================================

set -e

CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

echo -e "\n${CYAN}╔══════════════════════════════════════════════════════════════════╗"
echo -e "║    UniversalMediaStudio • Post-Clone Setup & Startup Pipeline    ║"
echo -e "╚══════════════════════════════════════════════════════════════════╝${NC}\n"

CLEAN=false
BUILD=false
CHECK_ONLY=false

for arg in "$@"; do
  case $arg in
    --clean|-c) CLEAN=true ;;
    --build|-b) BUILD=true ;;
    --check-only) CHECK_ONLY=true ;;
  esac
done

TOTAL_STEPS=6
STEP=1

echo -e "${MAGENTA}[$STEP/$TOTAL_STEPS] Scanning Project Configuration (package.json)${NC}"
echo -e "${GRAY}------------------------------------------------------------${NC}"
STEP=$((STEP + 1))

if [ ! -f "package.json" ]; then
  echo -e "${RED}package.json not found in $ROOT_DIR${NC}"
  exit 1
fi

PKG_MANAGER="npm"
if command -v bun &> /dev/null; then
  PKG_MANAGER="bun"
elif command -v pnpm &> /dev/null; then
  PKG_MANAGER="pnpm"
elif command -v yarn &> /dev/null; then
  PKG_MANAGER="yarn"
fi
echo -e "  Detected package manager: ${GREEN}${PKG_MANAGER}${NC}"

echo -e "\n${MAGENTA}[$STEP/$TOTAL_STEPS] Cache & Directory Validation${NC}"
echo -e "${GRAY}------------------------------------------------------------${NC}"
STEP=$((STEP + 1))

if [ "$CLEAN" = true ]; then
  echo -e "  ${YELLOW}Cleaning node_modules, out, dist...${NC}"
  rm -rf node_modules out dist node_modules/.vite
fi

echo -e "\n${MAGENTA}[$STEP/$TOTAL_STEPS] Installing Dependencies via $PKG_MANAGER${NC}"
echo -e "${GRAY}------------------------------------------------------------${NC}"
STEP=$((STEP + 1))

$PKG_MANAGER install
echo -e "  ${GREEN}✔ Dependencies installed successfully.${NC}"

echo -e "\n${MAGENTA}[$STEP/$TOTAL_STEPS] Verifying Electron Runtime Binary${NC}"
echo -e "${GRAY}------------------------------------------------------------${NC}"
STEP=$((STEP + 1))

if [ -f "node_modules/electron/install.js" ]; then
  node node_modules/electron/install.js
  echo -e "  ${GREEN}✔ Electron binary verified.${NC}"
fi

echo -e "\n${MAGENTA}[$STEP/$TOTAL_STEPS] Running TypeScript Typechecks${NC}"
echo -e "${GRAY}------------------------------------------------------------${NC}"
STEP=$((STEP + 1))

$PKG_MANAGER run typecheck:node
$PKG_MANAGER run typecheck:web
echo -e "  ${GREEN}✔ All typechecks passed.${NC}"

echo -e "\n${MAGENTA}[$STEP/$TOTAL_STEPS] Execution Phase${NC}"
echo -e "${GRAY}------------------------------------------------------------${NC}"
STEP=$((STEP + 1))

echo -e "\n${GREEN}✨ Setup complete!${NC}\n"

if [ "$CHECK_ONLY" = true ]; then
  exit 0
fi

if [ "$BUILD" = true ]; then
  $PKG_MANAGER run build
else
  $PKG_MANAGER run dev
fi
