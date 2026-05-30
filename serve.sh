#!/usr/bin/env bash
PORT=${1:-8000}
echo "Serving at http://localhost:$PORT"
python3 -m http.server "$PORT"
