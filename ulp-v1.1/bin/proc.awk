#!/usr/bin/awk -f
# bin/proc.awk - Parse .procedure with Pattern_Syntax multiset validation
# ULP v1.1 - Enforces multiset(open) == multiset(close)

function trim(s) {
    sub(/^[ \t\r\n]+/, "", s)
    sub(/[ \t\r\n]+$/, "", s)
    return s
}

function extract_sig(line, s) {
    s = line
    # Remove whitespace and identifiers, leaving only delimiters
    gsub(/[ \t\r\n]/, "", s)
    gsub(/[A-Za-z0-9_:\-\.]/, "", s)
    return s
}

function multiset_key(sig,    i, n, chars, tmp, cmd, key) {
    # Create temp file for sorting in current directory
    tmp = ".ms_" PROCINFO["pid"] "_" int(rand() * 1000000)

    # Split signature into characters
    n = split(sig, chars, "")
    for (i = 1; i <= n; i++) {
        print chars[i] > tmp
    }
    close(tmp)

    # Sort characters
    cmd = "sort " tmp
    key = ""
    while ((cmd | getline x) > 0) {
        key = key x
    }
    close(cmd)

    # Cleanup
    system("rm -f " tmp)

    return key
}

BEGIN {
    srand()
    cur = ""
    nlines = 0
}

{
    raw[++nlines] = $0
}

END {
    for (i = 1; i <= nlines; i++) {
        t = trim(raw[i])

        # Skip empty lines and comments
        if (t == "" || t ~ /^#/) continue

        # Procedure declaration
        if (t ~ /^procedure[ \t]+/) {
            split(t, a, /[\t ]+/)
            cur = a[2]
        }

        # Must be inside a procedure
        if (cur == "") {
            continue
        }

        # Interrupt declaration
        if (t ~ /^interrupt[ \t]+/) {
            split(t, a, /[\t ]+/)
            intr = a[2]

            # Find nearest previous non-empty line (opening signature)
            j = i - 1
            openLine = ""
            while (j >= 1) {
                tt = trim(raw[j])
                if (tt == "" || tt ~ /^#/) {
                    j--
                    continue
                }
                if (tt ~ /^procedure[ \t]+/) break
                openLine = raw[j]
                break
            }

            # Find next non-empty line (closing signature)
            k = i + 1
            closeLine = ""
            while (k <= nlines) {
                tt = trim(raw[k])
                if (tt == "" || tt ~ /^#/) {
                    k++
                    continue
                }
                if (tt ~ /^interrupt[ \t]+/) break
                if (tt ~ /^procedure[ \t]+/) break
                closeLine = raw[k]
                break
            }

            openSig = extract_sig(openLine)
            closeSig = extract_sig(closeLine)

            # Validate signatures exist
            if (openSig == "" || closeSig == "") {
                printf("error: missing open/close signatures around interrupt %s in procedure %s\n", \
                       intr, cur) > "/dev/stderr"
                exit 6
            }

            # Validate multiset equivalence
            if (multiset_key(openSig) != multiset_key(closeSig)) {
                printf("error: multiset mismatch in %s: OPEN=[%s] CLOSE=[%s] INT=[%s]\n", \
                       cur, openSig, closeSig, intr) > "/dev/stderr"
                exit 7
            }

            # Emit validated clause (tab-separated)
            printf("CLAUSE\t%s\t%s\t%s\t%s\n", cur, openSig, closeSig, intr)
        }
    }
}
