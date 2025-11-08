#!/bin/bash
cd "$(dirname "$0")"
../venv/bin/uvicorn main:app --reload --port 8000 --host 0.0.0.0
