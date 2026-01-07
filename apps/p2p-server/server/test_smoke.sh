#!/bin/sh
# Minimal smoke test for ULP v2.0 p2p-server
set -eu

PORT="${PORT:-8080}"
TRACE_DIR="${TRACE_DIR:-../../out}"
BIN="./p2p-server"

if [ ! -x "$BIN" ]; then
    echo "Build the server first: go build -o p2p-server" >&2
    exit 1
fi

LOG_FILE="$(mktemp /tmp/p2p-server-log.XXXXXX)"

cleanup() {
    if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        kill "$SERVER_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

echo "Starting p2p-server (port $PORT, traces $TRACE_DIR)"
$BIN -traces="$TRACE_DIR" -port="$PORT" >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

# Wait for HTTP API to respond
tries=0
until curl -sSf "http://localhost:${PORT}/api/records" >/dev/null 2>&1; do
    tries=$((tries + 1))
    if [ "$tries" -gt 20 ]; then
        echo "Server did not start; see log: $LOG_FILE" >&2
        exit 1
    fi
    sleep 0.25
done

echo "Server is up; log: $LOG_FILE"

# Fetch records list
records_json="$(curl -sSf "http://localhost:${PORT}/api/records")"
rid="$(printf '%s' "$records_json" | awk -F'"' '/"rid"/ {print $4; exit}')"

if [ -z "$rid" ]; then
    echo "No records returned; ensure traces exist in $TRACE_DIR" >&2
    exit 1
fi

echo "Found record RID: $rid"

# Download record bytes and verify SHA-256 matches RID
tmp_trace="$(mktemp /tmp/p2p-trace.XXXXXX)"
curl -sSf "http://localhost:${PORT}/api/record/${rid}" -o "$tmp_trace"

hash="$(sha256sum "$tmp_trace" | awk '{print $1}')"
if [ "$hash" != "$rid" ]; then
    echo "RID mismatch: expected $rid, got $hash" >&2
    exit 1
fi

echo "RID verified ✅"
echo "Smoke test passed"
