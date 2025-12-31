#!/bin/sh
#===============================================================================
# projections/visual/w3c_dom.sh - W3C DOM Projection
#===============================================================================
# ULP v1.1 - π_w3c_dom projection
# Renders trace as DOM tree structure (JSON representation of DOM nodes)
#===============================================================================
set -eu
TRACE="${1:-/dev/stdin}"
awk -F'\t' 'BEGIN {
    print "{\"nodeName\": \"#document\", \"children\": ["
    print "  {\"nodeName\": \"html\", \"children\": ["
    print "    {\"nodeName\": \"head\", \"children\": [{\"nodeName\": \"title\", \"textContent\": \"ULP Trace\"}]},"
    print "    {\"nodeName\": \"body\", \"children\": ["
}
$1=="STDOUT" && NF>=5 {
    text=$5; gsub(/"/, "\\\"", text); gsub(/\\n/, " ", text)
    printf "      {\"nodeName\": \"div\", \"className\": \"output\", \"textContent\": \"%s\"},\n", text
}
END {
    print "      {\"nodeName\": \"div\", \"textContent\": \"\"}"
    print "    ]}"
    print "  ]}"
    print "]}"
}' "$TRACE"
