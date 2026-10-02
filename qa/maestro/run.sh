#!/usr/bin/env bash
# Run Maestro journeys on the booted iPhone 16 simulator. Screenshots → qa/evidence/maestro/
# Usage: qa/maestro/run.sh [flow.yaml ...]   (default: all U*.yaml)
set -uo pipefail
cd "$(dirname "$0")"
export MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true
DEVICE="${SIM_UDID:-1A0D96E0-F04F-46F3-BFF5-517496BD4B11}"
OUT="../evidence/maestro"; mkdir -p "$OUT"
flows=("$@"); [ ${#flows[@]} -eq 0 ] && flows=(U*.yaml)
for f in "${flows[@]}"; do
  maestro --device "$DEVICE" test --test-output-dir "$OUT" "$f"
done
