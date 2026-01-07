#!/bin/sh
#===============================================================================
# projections/text/json.sh - JSON Projection Implementation
#===============================================================================
# ULP v1.1 - π_json projection
#
# PURPOSE:
#   Convert ULP trace to structured JSON format.
#   Extracts key trace events and renders as JSON.
#
# USAGE:
#   ./projections/text/json.sh TRACE_FILE
#
# INPUT:
#   - TRACE_FILE: ULP trace in tab-separated format
#
# OUTPUT:
#   - stdout: JSON representation of trace
#
# JSON STRUCTURE:
#   {
#     "version": "1.1",
#     "world_id": "...",
#     "inputs": [...],
#     "outputs": [...],
#     "events": [...],
#     "exit_code": 0
#   }
#
# PRESERVES:
#   - Principle 3: Pure function (read-only, deterministic, no side effects)
#
#===============================================================================
set -eu

TRACE="${1:-/dev/stdin}"

awk -F'\t' '
BEGIN {
    print "{"
    print "  \"version\": \"1.1\","
    first_input = 1
    first_output = 1
    first_event = 1
}

$1 == "WORLD" && NF >= 3 {
    world_id = $3
    print "  \"world_id\": \"" world_id "\","
}

$1 == "STDIN" && NF >= 5 {
    if (first_input) {
        print "  \"inputs\": ["
        first_input = 0
    } else {
        print ","
    }
    text = $5
    gsub(/"/, "\\\"", text)
    gsub(/\\n/, "\\n", text)
    printf "    {\"n\": " $2 ", \"text\": \"" text "\"}"
}

$1 == "STDOUT" && NF >= 5 {
    if (first_output) {
        if (!first_input) print "\n  ],"
        print "  \"outputs\": ["
        first_output = 0
    } else {
        print ","
    }
    text = $5
    gsub(/"/, "\\\"", text)
    gsub(/\\n/, "\\n", text)
    printf "    {\"n\": " $2 ", \"text\": \"" text "\"}"
}

$1 == "EVENT" && NF >= 3 {
    if (first_event) {
        if (!first_output) print "\n  ],"
        print "  \"events\": ["
        first_event = 0
    } else {
        print ","
    }
    # Build event object
    printf "    {\"type\": \"" $3 "\""
    for (i = 4; i <= NF; i += 2) {
        if (i+1 <= NF) {
            key = $i
            val = $(i+1)
            gsub(/"/, "\\\"", val)
            printf ", \"" key "\": \"" val "\""
        }
    }
    printf "}"
}

$1 == "EXIT" && NF >= 4 {
    exit_code = $4
}

END {
    if (!first_event) print "\n  ],"
    else if (!first_output) print "\n  ],"
    else if (!first_input) print "\n  ],"

    if (exit_code != "") {
        print "  \"exit_code\": " exit_code
    } else {
        print "  \"exit_code\": 0"
    }
    print "}"
}
' "$TRACE"
