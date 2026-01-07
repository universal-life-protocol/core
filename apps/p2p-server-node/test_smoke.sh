#!/bin/sh
# Smoke test for Node ULP v2.0 P2P server
# - fetches /api/records
# - downloads first record
# - verifies SHA-256 matches RID
# - prints peer ID and addresses
set -eu

BASE_URL="${BASE_URL:-http://localhost:8080}"
TMP_TRACE="$(mktemp /tmp/ulp-node-trace.XXXXXX)"

echo "Checking ${BASE_URL}"

records_json="$(curl -sSf "${BASE_URL}/api/records")"
rid="$(printf '%s' "$records_json" | awk -F'"' '/"rid"/ {print $4; exit}')"

if [ -z "$rid" ]; then
    echo "No records returned from ${BASE_URL}/api/records" >&2
    exit 1
fi

echo "Found RID: $rid"

curl -sSf "${BASE_URL}/api/record/${rid}" -o "$TMP_TRACE"

hash="$(sha256sum "$TMP_TRACE" | awk '{print $1}')"
if [ "$hash" != "$rid" ]; then
    echo "RID mismatch: expected $rid, got $hash" >&2
    exit 1
fi

echo "RID verified ✅"

echo "Connection info:"
curl -sSf "${BASE_URL}/api/connection" | jq .

echo "Smoke test passed"
