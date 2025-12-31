#!/usr/bin/awk -f
# bin/trace.awk - Trace formatting utilities
# ULP v1.1 - TSV format with escaping

function esc(s) {
    gsub(/\\/, "\\\\", s)
    gsub(/\t/, "\\t", s)
    gsub(/\r/, "\\r", s)
    gsub(/\n/, "\\n", s)
    return s
}

function unesc(s) {
    gsub(/\\n/, "\n", s)
    gsub(/\\r/, "\r", s)
    gsub(/\\t/, "\t", s)
    gsub(/\\\\/, "\\", s)
    return s
}

function emit2(k, a, b) {
    printf("%s\t%s\t%s\n", k, esc(a), esc(b))
}

function emit3(k, a, b, c) {
    printf("%s\t%s\t%s\t%s\n", k, esc(a), esc(b), esc(c))
}

function emitKV(k, key, val) {
    printf("%s\t%s\t%s\n", k, esc(key), esc(val))
}
