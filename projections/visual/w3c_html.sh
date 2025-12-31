#!/bin/sh
#===============================================================================
# projections/visual/w3c_html.sh - W3C HTML Projection Implementation
#===============================================================================
# ULP v1.1 - π_w3c_html projection
#
# PURPOSE:
#   Render ULP trace as W3C-compliant HTML document.
#   Creates visual representation viewable in any web browser.
#
# USAGE:
#   ./projections/visual/w3c_html.sh TRACE_FILE > output.html
#
# INPUT:
#   - TRACE_FILE: ULP trace in tab-separated format
#
# OUTPUT:
#   - stdout: Complete HTML5 document
#
# HTML STRUCTURE:
#   - Semantic HTML5
#   - Embedded CSS for styling
#   - Trace sections as <section> elements
#   - Events as timeline
#
# PRESERVES:
#   - Principle 3: Pure function (read-only, deterministic, no side effects)
#
#===============================================================================
set -eu

TRACE="${1:-/dev/stdin}"

cat << 'HTML_HEADER'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="generator" content="ULP v1.1 π_w3c_html projection">
    <title>ULP Trace Visualization</title>
    <style>
        :root {
            --bg-primary: #1a1a1a;
            --bg-secondary: #2d2d2d;
            --text-primary: #e0e0e0;
            --text-secondary: #a0a0a0;
            --accent: #00d4ff;
            --success: #00ff88;
            --border: #404040;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Consolas', 'Monaco', monospace;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            padding: 2rem;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: var(--accent); margin-bottom: 1rem; font-size: 2rem; }
        h2 { color: var(--text-primary); margin: 2rem 0 1rem; font-size: 1.5rem; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; }
        .meta { background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-bottom: 2rem; border-left: 4px solid var(--accent); }
        .meta-item { margin: 0.5rem 0; }
        .meta-label { color: var(--text-secondary); font-weight: bold; }
        .meta-value { color: var(--success); font-family: monospace; }
        .section { margin: 2rem 0; }
        .timeline { list-style: none; border-left: 2px solid var(--border); padding-left: 2rem; margin-left: 1rem; }
        .timeline-item { margin: 1rem 0; position: relative; }
        .timeline-item::before { content: '●'; position: absolute; left: -2.35rem; color: var(--accent); font-size: 1.2rem; }
        .event { background: var(--bg-secondary); padding: 1rem; border-radius: 4px; margin: 0.5rem 0; }
        .event-type { color: var(--accent); font-weight: bold; }
        .event-details { color: var(--text-secondary); margin-top: 0.5rem; }
        .output { background: var(--bg-secondary); padding: 1rem; border-radius: 4px; font-family: monospace; white-space: pre-wrap; margin: 0.5rem 0; border-left: 4px solid var(--success); }
        .input { background: var(--bg-secondary); padding: 1rem; border-radius: 4px; font-family: monospace; margin: 0.5rem 0; border-left: 4px solid var(--accent); }
        .exit-status { background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-top: 2rem; display: inline-block; }
        .exit-code { color: var(--success); font-size: 1.2rem; font-weight: bold; }
        code { background: var(--bg-secondary); padding: 0.2rem 0.4rem; border-radius: 3px; color: var(--accent); }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔷 ULP Trace Visualization</h1>
HTML_HEADER

awk -F'\t' '
$1 == "WORLD" && NF >= 3 {
    wid = $3
    printf "<div class=\"meta\">\n"
    printf "  <div class=\"meta-item\"><span class=\"meta-label\">World ID:</span> <code class=\"meta-value\">%s</code></div>\n", substr(wid, 1, 32) "..."
}

$1 == "HDR" && $2 == "version" {
    printf "  <div class=\"meta-item\"><span class=\"meta-label\">Version:</span> <span class=\"meta-value\">ULP %s</span></div>\n", $3
}

$1 == "BEGIN" && $2 == "execution" {
    if (meta_open) {
        printf "</div>\n"
        meta_open = 0
    }
}

$1 == "STDIN" && NF >= 5 {
    if (!seen_input) {
        printf "<section class=\"section\">\n<h2>📥 Inputs</h2>\n"
        seen_input = 1
    }
    text = $5
    gsub(/</, "\\&lt;", text)
    gsub(/>/, "\\&gt;", text)
    gsub(/\\n/, "<br>", text)
    printf "<div class=\"input\">Input %s: %s</div>\n", $2, text
}

$1 == "STDOUT" && NF >= 5 {
    if (seen_input && !input_closed) {
        printf "</section>\n"
        input_closed = 1
    }
    if (!seen_output) {
        printf "<section class=\"section\">\n<h2>📤 Outputs</h2>\n"
        seen_output = 1
    }
    text = $5
    gsub(/</, "\\&lt;", text)
    gsub(/>/, "\\&gt;", text)
    gsub(/\\\\/, "\\", text)
    gsub(/\\n/, "\n", text)
    gsub(/\\t/, "    ", text)
    printf "<div class=\"output\">%s</div>\n", text
}

$1 == "EVENT" && NF >= 3 {
    if (seen_output && !output_closed) {
        printf "</section>\n"
        output_closed = 1
    }
    if (!seen_event) {
        printf "<section class=\"section\">\n<h2>⚡ Events</h2>\n<ul class=\"timeline\">\n"
        seen_event = 1
    }
    event_type = $3
    details = ""
    for (i = 4; i <= NF; i += 2) {
        if (i+1 <= NF) {
            details = details "<span class=\"event-details\">" $i ": " $(i+1) "</span> "
        }
    }
    printf "<li class=\"timeline-item\"><div class=\"event\"><span class=\"event-type\">%s</span> %s</div></li>\n", event_type, details
}

$1 == "EXIT" && NF >= 4 {
    if (seen_event && !event_closed) {
        printf "</ul>\n</section>\n"
        event_closed = 1
    }
    exit_code = $4
    exit_intr = $2
    printf "<div class=\"exit-status\">Exit: <code>%s</code> with code <span class=\"exit-code\">%s</span></div>\n", exit_intr, exit_code
}

BEGIN { meta_open = 1 }

END {
    if (seen_input && !input_closed) printf "</section>\n"
    if (seen_output && !output_closed) printf "</section>\n"
    if (seen_event && !event_closed) printf "</ul>\n</section>\n"
}
' "$TRACE"

cat << 'HTML_FOOTER'
    </div>
    <footer style="margin-top: 4rem; text-align: center; color: var(--text-secondary); border-top: 1px solid var(--border); padding-top: 2rem;">
        Generated from ULP v1.1 trace using π_w3c_html projection<br>
        <small>Pure function • Read-only • Deterministic</small>
    </footer>
</body>
</html>
HTML_FOOTER
