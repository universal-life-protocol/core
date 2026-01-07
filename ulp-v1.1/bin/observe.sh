#!/bin/sh
#===============================================================================
# bin/observe.sh - ULP v1.1 Projection Dispatcher
#===============================================================================
# ULP v1.1 - Universal projection system
#
# PURPOSE:
#   Dispatch to any of the 16 sealed projection classes.
#   Routes trace through appropriate pure projection function.
#
# USAGE:
#   ./bin/observe.sh [WORLD_DIR] TRACE_FILE [PROJECTION_TYPE]
#   ./bin/observe.sh world out/trace.log json
#
# ARGUMENTS:
#   WORLD_DIR       - World definition directory (default: world)
#   TRACE_FILE      - Trace file to project (required)
#   PROJECTION_TYPE - One of 16 sealed types (default: from .view or canonical)
#
# THE 16 SEALED PROJECTION CLASSES:
#   Text:      posix, json, markdown, pure
#   Visual:    w3c_html, w3c_dom, w3c_css
#   3D:        webgl_3d, canvas_2d, vulkan
#   Identity:  bip32, bip39
#   Analysis:  graph, network_graph, print
#   Meta:      raw, canonical
#
# PRESERVES:
#   - Principle 3: All projections are pure functions
#   - Read-only, deterministic, no side effects
#
#===============================================================================
set -eu

WORLD="${1:-world}"
TRACE="${2:-}"
PROJECTION="${3:-}"

# Validate trace file
if [ -z "$TRACE" ] || [ ! -f "$TRACE" ]; then
    echo "error: trace file required" >&2
    echo "usage: $0 [world_dir] trace_file [projection]" >&2
    exit 1
fi

# Determine projection type
if [ -n "$PROJECTION" ]; then
    view_type="$PROJECTION"
elif [ -f "$WORLD/.view" ]; then
    view_type="$(awk '$1=="view" {print $2; exit}' "$WORLD/.view" 2>/dev/null || echo "canonical")"
else
    view_type="canonical"
fi

# Dispatch to appropriate projection
case "$view_type" in
    # Text projections
    posix)
        if [ -x "projections/text/posix.sh" ]; then
            projections/text/posix.sh "$TRACE"
        else
            awk -F'\t' '$1=="STDOUT" && NF>=5 {text=$5; gsub(/\\\\/,"\\",text); gsub(/\\n/,"\n",text); gsub(/\\t/,"\t",text); print text}' "$TRACE"
        fi
        ;;
    json)
        if [ -x "projections/text/json.sh" ]; then
            projections/text/json.sh "$TRACE"
        else
            echo '{"error": "json projection not available"}' >&2
            exit 1
        fi
        ;;
    markdown)
        [ -x "projections/text/markdown.sh" ] && projections/text/markdown.sh "$TRACE" || { echo "error: markdown projection not available" >&2; exit 1; }
        ;;
    pure)
        [ -x "projections/text/pure.sh" ] && projections/text/pure.sh "$TRACE" || { echo "error: pure projection not available" >&2; exit 1; }
        ;;

    # Visual projections
    w3c_html)
        [ -x "projections/visual/w3c_html.sh" ] && projections/visual/w3c_html.sh "$TRACE" || { echo "error: w3c_html projection not available" >&2; exit 1; }
        ;;
    w3c_dom)
        [ -x "projections/visual/w3c_dom.sh" ] && projections/visual/w3c_dom.sh "$TRACE" || { echo "error: w3c_dom projection not available" >&2; exit 1; }
        ;;
    w3c_css)
        [ -x "projections/visual/w3c_css.sh" ] && projections/visual/w3c_css.sh "$TRACE" || { echo "error: w3c_css projection not available" >&2; exit 1; }
        ;;

    # 3D projections
    webgl_3d)
        [ -x "projections/3d/webgl_3d.sh" ] && projections/3d/webgl_3d.sh "$TRACE" || { echo "error: webgl_3d projection not available" >&2; exit 1; }
        ;;
    canvas_2d)
        [ -x "projections/3d/canvas_2d.sh" ] && projections/3d/canvas_2d.sh "$TRACE" || { echo "error: canvas_2d projection not available" >&2; exit 1; }
        ;;
    vulkan)
        [ -x "projections/3d/vulkan.sh" ] && projections/3d/vulkan.sh "$TRACE" || { echo "error: vulkan projection not available" >&2; exit 1; }
        ;;

    # Identity projections
    bip32)
        [ -x "projections/identity/bip32.sh" ] && projections/identity/bip32.sh "$TRACE" || { echo "error: bip32 projection not available" >&2; exit 1; }
        ;;
    bip39)
        [ -x "projections/identity/bip39.sh" ] && projections/identity/bip39.sh "$TRACE" || { echo "error: bip39 projection not available" >&2; exit 1; }
        ;;

    # Analysis projections
    graph)
        [ -x "projections/analysis/graph.sh" ] && projections/analysis/graph.sh "$TRACE" || { echo "error: graph projection not available" >&2; exit 1; }
        ;;
    network_graph)
        [ -x "projections/analysis/network_graph.sh" ] && projections/analysis/network_graph.sh "$TRACE" || { echo "error: network_graph projection not available" >&2; exit 1; }
        ;;
    print)
        [ -x "projections/analysis/print.sh" ] && projections/analysis/print.sh "$TRACE" || { echo "error: print projection not available" >&2; exit 1; }
        ;;

    # Meta projections
    raw)
        cat "$TRACE"
        ;;
    canonical)
        # Canonical POSIX stdout view (inline fallback)
        awk -F'\t' '
        $1=="STDOUT" && NF>=5 {
            text = $5
            gsub(/\\\\/, "\\", text)
            gsub(/\\t/, "\t", text)
            gsub(/\\r/, "\r", text)
            gsub(/\\n/, "\n", text)
            print text
        }
        ' "$TRACE"
        ;;

    *)
        echo "error: unknown projection type: $view_type" >&2
        echo "valid types: posix, json, markdown, pure, w3c_html, w3c_dom, w3c_css," >&2
        echo "             webgl_3d, canvas_2d, vulkan, bip32, bip39, graph," >&2
        echo "             network_graph, print, raw, canonical" >&2
        exit 1
        ;;
esac
