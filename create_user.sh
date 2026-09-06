#!/usr/bin/env bash
# Crée un utilisateur (pas d'inscription publique). Usage :
#   ./create_user.sh alice@example.com [--admin]
set -euo pipefail
cd "$(dirname "$0")/infra"
docker compose exec backend python -m app.scripts.create_user "$@"
