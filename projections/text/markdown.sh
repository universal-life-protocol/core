#!/bin/sh
#===============================================================================
# projections/text/markdown.sh - Markdown Projection Implementation
#===============================================================================
# ULP v1.1 - π_markdown projection
#
# PURPOSE:
#   Convert ULP trace to Markdown documentation format.
#   Useful for generating human-readable reports from traces.
#
# USAGE:
#   ./projections/text/markdown.sh TRACE_FILE
#
# INPUT:
#   - TRACE_FILE: ULP trace in tab-separated format
#
# OUTPUT:
#   - stdout: Markdown-formatted document
#
# MARKDOWN STRUCTURE:
#   # Execution Report
#   ## World: <wid>
#   ## Inputs
#   - input 1
#   ## Outputs
#   - output 1
#   ## Events
#   - event 1
#
# PRESERVES:
#   - Principle 3: Pure function (read-only, deterministic, no side effects)
#
#===============================================================================
set -eu

TRACE="${1:-/dev/stdin}"

awk -F'\t' '
BEGIN {
    print "# ULP Execution Report"
    print ""
}

$1 == "HDR" && $2 == "version" {
    version = $3
}

$1 == "WORLD" && NF >= 3 {
    wid = $3
    print "## World Identity"
    print ""
    print "**WID**: `" substr(wid, 1, 16) "...`"
    print ""
}

$1 == "STDIN" && NF >= 5 {
    if (!seen_input) {
        print "## Inputs"
        print ""
        seen_input = 1
    }
    text = $5
    gsub(/\\n/, "\n", text)
    gsub(/\\t/, "    ", text)
    print "- Input " $2 ": `" text "`"
}

$1 == "STDOUT" && NF >= 5 {
    if (!seen_output) {
        print ""
        print "## Outputs"
        print ""
        seen_output = 1
    }
    text = $5
    gsub(/\\\\/, "\\", text)
    gsub(/\\n/, "\n", text)
    gsub(/\\t/, "    ", text)
    print text
    print ""
}

$1 == "EVENT" && NF >= 3 {
    if (!seen_event) {
        print "## Events"
        print ""
        seen_event = 1
    }
    event_type = $3
    details = ""
    for (i = 4; i <= NF; i += 2) {
        if (i+1 <= NF) {
            details = details " " $i "=" $(i+1)
        }
    }
    print "- **" event_type "**" details
}

$1 == "EXIT" && NF >= 4 {
    exit_code = $4
    exit_intr = $2
}

END {
    if (exit_code != "") {
        print ""
        print "## Exit Status"
        print ""
        print "- Interrupt: `" exit_intr "`"
        print "- Exit code: `" exit_code "`"
    }
    print ""
    print "---"
    print "*Generated from ULP v1.1 trace*"
}
' "$TRACE"
