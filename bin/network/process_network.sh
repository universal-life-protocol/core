#!/bin/sh
# bin/network/process_network.sh - Network configuration processor
# Validates and processes .network files
set -eu
NETWORK_FILE="${1:-.network}"
if [ ! -f "$NETWORK_FILE" ]; then
    echo "Air-gapped: No .network file (networking disabled)" >&2
    exit 0
fi
echo "# Network capabilities from $NETWORK_FILE"
awk '/families:/{f=1;next} /socket_types:/{f=0;s=1;next} /security:/{s=0;next} f{print "family: "$2} s{print "socket_type: "$2}' "$NETWORK_FILE"
