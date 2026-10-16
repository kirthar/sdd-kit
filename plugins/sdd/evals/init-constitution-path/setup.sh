#!/bin/bash
set -euo pipefail
bash "$(dirname "$0")/../_shared/repo.sh" base
printf 'paths: { constitution: docs/constitution.md }\n' >> .sdd/config.yaml
git add -A && git commit -q -m "chore: configure the constitution location"
