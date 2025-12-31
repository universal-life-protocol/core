#!/usr/bin/awk -f
# bin/canon.awk - Canonicalize identifier-only files
# ULP v1.1 - Enforces world file non-executability

function trim(s) {
    sub(/^[ \t\r\n]+/, "", s)
    sub(/[ \t\r\n]+$/, "", s)
    return s
}

function is_ident(s) {
    return (s ~ /^[A-Za-z_][A-Za-z0-9_:\-\.]*$/)
}

{
    line = $0
    line = trim(line)

    # Skip empty lines and comments
    if (line == "" || line ~ /^#/) next

    # Split on whitespace
    n = split(line, tokens, /[\t ]+/)
    out = ""

    for (i = 1; i <= n; i++) {
        if (tokens[i] == "") continue

        # Enforce identifier-only constraint
        if (!is_ident(tokens[i])) {
            printf("error: non-identifier token: [%s]\n", tokens[i]) > "/dev/stderr"
            exit 2
        }

        out = (out == "" ? tokens[i] : out " " tokens[i])
    }

    if (out != "") print out
}
