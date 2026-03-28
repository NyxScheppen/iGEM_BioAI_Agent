#!/usr/bin/env bash
set -e

echo "======================================"
echo " BioAI Agent environment setup start"
echo "======================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> Project root: ${PROJECT_ROOT}"

echo "==> Step 1: Setup Python environment"
bash "${SCRIPT_DIR}/setup_python_env.sh"

echo "==> Step 2: Check Rscript"
Rscript --version

echo "==> Step 3: Install R packages"
Rscript "${SCRIPT_DIR}/install_r_packages.R"

echo "======================================"
echo " Setup completed successfully"
echo "======================================"