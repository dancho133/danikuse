#!/usr/bin/env sh
# Danikuse on macOS/Linux is NOT certified in v0.1 (Windows-first). This script
# installs the same prerequisites so contributors can experiment; expect breakage.
set -e
command -v node >/dev/null || { echo "Node.js >= 18 required"; exit 1; }
command -v agent-browser >/dev/null || npm install -g agent-browser
command -v agent-desktop >/dev/null || npm install -g agent-desktop
mkdir -p "$HOME/.danikuse/automation-profile"
node "$(dirname "$0")/bin/danikuse.mjs" doctor
