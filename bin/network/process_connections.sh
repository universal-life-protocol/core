#!/bin/sh
# bin/network/process_connections.sh - Connection topology processor  
# Validates and processes .connections files
set -eu
CONN_FILE="${1:-.connections}"
if [ ! -f "$CONN_FILE" ]; then
    echo "No connections defined" >&2
    exit 0
fi
echo "# Network topology from $CONN_FILE"
awk '/endpoints:/{e=1;next} /allowed_flows:/{e=0;f=1;next} e && $1~/[a-z]/{print "endpoint: "$1} f && /- from:/{print "flow: "$3" -> "$(NF)}' "$CONN_FILE"
