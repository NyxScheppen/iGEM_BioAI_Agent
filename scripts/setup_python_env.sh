#!/usr/bin/env bash
set -e

echo "==> Checking Python..."
python --version || python3 --version

echo "==> Upgrading pip..."
python -m pip install --upgrade pip setuptools wheel

echo "==> Installing Python packages..."
python -m pip install \
  fastapi \
  uvicorn \
  python-multipart \
  pydantic \
  pandas \
  openpyxl \
  requests

echo "==> Python environment setup done."