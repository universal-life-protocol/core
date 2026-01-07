#!/usr/bin/awk -f
#
# poly.awk — ULP v2.0 Execution Algebra
# Supports: open-envelope mode, weighted atoms, deterministic decompile traces
#

BEGIN {
    FS = "[ \t]+"
    PROCNAME = ""
    INTRNAME = ""
    SECTION = ""
    PROC_MODE = "closed"
    PROC_SIGN = "same"
    PROC_SHADOW = "first_atom"

    if (!TRACE_FILE) {
        TRACE_FILE = "/dev/null"
    }

    load_atoms(WORLD_DIR "/.atom")
    load_manifest(WORLD_DIR "/.manifest")
    load_interface(WORLD_DIR "/.interface")
    parse_procedure(WORLD_DIR "/.procedure")
    parse_interrupts(WORLD_DIR "/.interrupt")

    if (EXPLAIN_INTR) {
        explain_interrupt(EXPLAIN_INTR)
        exit 0
    }

    evaluate()
    emit()
}

###############
# Deterministic sort helpers (simple bubble sort)
###############
function sort_list(arr, n,    i, j, tmp) {
    for (i = 1; i <= n; i++) {
        for (j = i + 1; j <= n; j++) {
            if (arr[i] > arr[j]) {
                tmp = arr[i]
                arr[i] = arr[j]
                arr[j] = tmp
            }
        }
    }
}

function sorted_keys(map, out_arr,    k, n) {
    n = 0
    for (k in map) {
        out_arr[++n] = k
    }
    sort_list(out_arr, n)
    return n
}

###############
# Load atoms with weights
###############
function load_atoms(file, line, a) {
    while ((getline line < file) > 0) {
        if (line ~ /^[ \t]*#/ || line ~ /^[ \t]*$/) {
            continue
        }
        if (line ~ /^[ \t]*atom[ \t]+/) {
            split(line, a)
            ATOM[a[2]] = 1
            if (a[3] == "weight" && a[4] != "") {
                ATOM_W[a[2]] = int(a[4])
            } else {
                ATOM_W[a[2]] = 1
            }
            emit_trace("ALG_ATOM", a[2] " weight " ATOM_W[a[2]])
        }
    }
    close(file)
}

#################
# Load manifest
#################
function load_manifest(file, line, a) {
    while ((getline line < file) > 0) {
        if (line ~ /^[ \t]*#/ || line ~ /^[ \t]*$/) {
            continue
        }
        if (line ~ /^max_degree/) {
            split(line, a)
            MAN_MAX_DEG = int(a[2])
            emit_trace("ALG_MANIFEST", "max_degree " MAN_MAX_DEG)
        } else if (line ~ /^max_wdegree/) {
            split(line, a)
            MAN_MAX_WDEG = int(a[2])
            emit_trace("ALG_MANIFEST", "max_wdegree " MAN_MAX_WDEG)
        } else if (line ~ /^ban_monomial_prefix/) {
            split(line, a)
            MAN_BAN_PREFIX[a[2]] = 1
            emit_trace("ALG_MANIFEST", "ban_monomial_prefix " a[2])
        }
    }
    close(file)
}

###################
# Load interface (decompile config)
###################
function load_interface(file) {
    if (file_exists(file)) {
        INTERFACE_ENABLED = 1
        emit_trace("ALG_INTERFACE", "decompile_enabled")
    }
}

###################
# Parse procedure
###################
function parse_procedure(file, line, a, mono, coef) {
    while ((getline line < file) > 0) {
        if (line ~ /^[ \t]*#/ || line ~ /^[ \t]*$/) {
            continue
        }
        if (line ~ /^procedure[ \t]+/) {
            split(line, a)
            PROCNAME = a[2]
            VERSION = a[4]
            emit_trace("ALG_PROC", PROCNAME " version " VERSION)
            continue
        }
        if (line ~ /^domain:/) {
            SECTION = "DOMAIN"
            continue
        }
        if (line ~ /^end domain/) {
            SECTION = ""
            continue
        }
        if (line ~ /^mode/) {
            split(line, a)
            PROC_MODE = a[2]
            emit_trace("ALG_PROC", PROCNAME " mode " PROC_MODE)
            continue
        }
        if (line ~ /^sign/) {
            split(line, a)
            PROC_SIGN = a[2]
            emit_trace("ALG_PROC", PROCNAME " sign " PROC_SIGN)
            continue
        }
        if (line ~ /^max_wdegree/) {
            split(line, a)
            PROC_MAX_WDEG = int(a[2])
            emit_trace("ALG_PROC", PROCNAME " max_wdegree " PROC_MAX_WDEG)
            continue
        }
        if (line ~ /^shadow/) {
            split(line, a)
            PROC_SHADOW = a[2]
            if (PROC_SHADOW !~ /^(first_atom|longest_prefix)$/) {
                PROC_SHADOW = "first_atom"
            }
            emit_trace("ALG_PROC", PROCNAME " shadow " PROC_SHADOW)
            continue
        }
        if (SECTION == "DOMAIN" && line ~ /^[+-]/) {
            coef = $1
            mono = $2
            E[mono] += coef
            E_DEG[mono] = monodeg(mono)
            E_WDEG[mono] = monowdeg(mono)
        }
    }
    close(file)

    n = sorted_keys(E, keys)
    for (i = 1; i <= n; i++) {
        m = keys[i]
        emit_trace("ALG_PROC_POLY", E[m] " " m)
    }
}

####################
# Parse interrupts
####################
function parse_interrupts(file, line, a, mono, coef) {
    while ((getline line < file) > 0) {
        if (line ~ /^[ \t]*#/ || line ~ /^[ \t]*$/) {
            continue
        }
        if (line ~ /^interrupt[ \t]+/) {
            split(line, a)
            INTRNAME = a[2]
            VERSION = a[4]
            I_DEG[INTRNAME] = 0
            I_WDEG[INTRNAME] = 0
            emit_trace("ALG_INTR", INTRNAME " version " VERSION)
            continue
        }
        if (line ~ /^poly:/) {
            SECTION = "POLY"
            continue
        }
        if (line ~ /^end poly/) {
            SECTION = ""
            continue
        }
        if (SECTION == "POLY" && line ~ /^[+-]/) {
            coef = $1
            mono = $2
            I[INTRNAME, mono] += coef
            I_DEG[INTRNAME] = max(I_DEG[INTRNAME], monodeg(mono))
            I_WDEG[INTRNAME] = max(I_WDEG[INTRNAME], monowdeg(mono))
        }
    }
    close(file)

    n = sorted_keys(I, keys)
    for (i = 1; i <= n; i++) {
        split(keys[i], a, SUBSEP)
        intr = a[1]
        mono = a[2]
        emit_trace("ALG_INTR_POLY", intr " " I[intr, mono] " " mono)
    }
}

###################
# Evaluation (first-failure-wins)
###################
function evaluate(m, cI, cE, a, atoms, atom, pfx, shadow_mono, n, i) {
    n = sorted_keys(I_DEG, intr_keys)
    for (idx = 1; idx <= n; idx++) {
        intr = intr_keys[idx]

        mcount = 0
        delete monos
        for (k in I) {
            split(k, a, SUBSEP)
            if (a[1] == intr) {
                monos[++mcount] = a[2]
            }
        }
        sort_list(monos, mcount)

        for (midx = 1; midx <= mcount; midx++) {
            mono = monos[midx]
            cI = I[intr, mono]

            n_atoms = split(mono, atoms, ".")
            for (i = 1; i <= n_atoms; i++) {
                atom = atoms[i]
                if (!(atom in ATOM)) {
                    if (!(intr in FAIL)) {
                        FAIL[intr] = "unknown_atom:" atom
                    }
                    break
                }
            }
            if (intr in FAIL) {
                break
            }

            pfx = atoms[1]
            if (pfx in MAN_BAN_PREFIX) {
                FAIL[intr] = "manifest_ban_prefix:" pfx
                break
            }

            if (MAN_MAX_DEG && monodeg(mono) > MAN_MAX_DEG) {
                FAIL[intr] = "manifest_degree_exceeded"
                break
            }

            if (MAN_MAX_WDEG && monowdeg(mono) > MAN_MAX_WDEG) {
                FAIL[intr] = "manifest_wdegree_exceeded"
                break
            }

            if (mono in E) {
                cE = E[mono]
            } else if (PROC_MODE == "open") {
                shadow_mono = compute_shadow(mono)
                if (!(shadow_mono in E)) {
                    FAIL[intr] = "open_shadow_missing:" shadow_mono
                    break
                }
                cE = E[shadow_mono]
                emit_trace("ALG_SHADOW", intr " " mono " " shadow_mono)
            } else {
                FAIL[intr] = "envelope_missing_monomial"
                break
            }

            if (abs(cI) > abs(cE)) {
                FAIL[intr] = "envelope_coef_exceeded"
                break
            }

            if (PROC_SIGN == "same" && (cI * cE < 0)) {
                FAIL[intr] = "envelope_sign_mismatch"
                break
            }

            if (PROC_MAX_WDEG && monowdeg(mono) > PROC_MAX_WDEG) {
                FAIL[intr] = "procedure_wdegree_exceeded"
                break
            }
        }

        if (!(intr in FAIL)) {
            OK[intr] = 1
        }
    }
}

###################
# Compute shadow (open mode)
###################
function compute_shadow(mono, a, n, prefix, test_prefix, i) {
    n = split(mono, a, ".")
    if (PROC_SHADOW == "longest_prefix") {
        prefix = a[1]
        for (i = 2; i <= n; i++) {
            test_prefix = prefix "." a[i]
            if (test_prefix in E) {
                prefix = test_prefix
            } else {
                break
            }
        }
        return prefix
    }
    return a[1]
}

###################
# Emit results (deterministic)
###################
function emit() {
    n = sorted_keys(I_DEG, intr_keys)
    for (i = 1; i <= n; i++) {
        intr = intr_keys[i]
        if (OK[intr]) {
            print "BIND", PROCNAME, intr, "ok", 1, "reason ok"
            emit_trace("ALG_BIND", PROCNAME " " intr " ok 1 reason ok")
        } else {
            print "BIND", PROCNAME, intr, "ok", 0, "reason", FAIL[intr]
            emit_trace("ALG_BIND", PROCNAME " " intr " ok 0 reason " FAIL[intr])
        }
    }

    if (INTERFACE_ENABLED) {
        emit_decompile()
    }
}

###################
# Emit decompile traces (deterministic)
###################
function emit_decompile(    n, i, mcount, mono_list, j) {
    emit_trace("DECOMP_START", PROCNAME)

    n = sorted_keys(E, keys)
    emit_trace("DECOMP_EMIT_PROC", PROCNAME)
    for (i = 1; i <= n; i++) {
        m = keys[i]
        emit_trace("DECOMP_EMIT_PROC_POLY", E[m] " " m)
    }

    n = sorted_keys(I_DEG, intr_keys)
    for (i = 1; i <= n; i++) {
        intr = intr_keys[i]
        emit_trace("DECOMP_EMIT_INTR", intr)

        mcount = 0
        delete mono_list
        for (k in I) {
            split(k, a, SUBSEP)
            if (a[1] == intr) {
                mono_list[++mcount] = a[2]
            }
        }
        sort_list(mono_list, mcount)
        for (j = 1; j <= mcount; j++) {
            m = mono_list[j]
            emit_trace("DECOMP_EMIT_INTR_POLY", intr " " I[intr, m] " " m)
        }
    }

    emit_trace("DECOMP_END", PROCNAME)
}

###################
# Explain mode (for explain.sh)
###################
function explain_interrupt(intr_name,    mono, cI, cE, shadow, atoms, i, j, n_atoms, mcount, mono_list, all_atoms_ok) {
    print "Interrupt: " intr_name
    print repeat("=", length(intr_name) + 11)

    if (!(intr_name in I_DEG)) {
        print "Not found in .interrupt"
        return
    }

    mcount = 0
    delete mono_list
    for (k in I) {
        split(k, a, SUBSEP)
        if (a[1] == intr_name) {
            mono_list[++mcount] = a[2]
        }
    }
    sort_list(mono_list, mcount)

    print "Polynomial:"
    for (j = 1; j <= mcount; j++) {
        mono = mono_list[j]
        cI = I[intr_name, mono]
        print "  " cI " * " mono " (degree: " monodeg(mono) ", wdegree: " monowdeg(mono) ")"
    }
    print ""

    print "Checking admissibility:"
    for (j = 1; j <= mcount; j++) {
        mono = mono_list[j]
        cI = I[intr_name, mono]
        print "  Monomial: " mono
        print "    Coefficient: " cI

        n_atoms = split(mono, atoms, ".")
        all_atoms_ok = 1
        for (i = 1; i <= n_atoms; i++) {
            if (!(atoms[i] in ATOM)) {
                print "    Unknown atom: " atoms[i]
                all_atoms_ok = 0
            }
        }
        if (all_atoms_ok) {
            print "    All atoms valid"
        }

        if (atoms[1] in MAN_BAN_PREFIX) {
            print "    Banned prefix: " atoms[1]
        } else {
            print "    Prefix not banned"
        }

        if (MAN_MAX_DEG && monodeg(mono) > MAN_MAX_DEG) {
            print "    Degree exceeded: " monodeg(mono) " > " MAN_MAX_DEG
        } else if (MAN_MAX_DEG) {
            print "    Degree within limit"
        }

        if (MAN_MAX_WDEG && monowdeg(mono) > MAN_MAX_WDEG) {
            print "    Weighted degree exceeded: " monowdeg(mono) " > " MAN_MAX_WDEG
        } else if (MAN_MAX_WDEG) {
            print "    Weighted degree within limit"
        }

        if (mono in E) {
            cE = E[mono]
            print "    Monomial in envelope"
            print "      Envelope coefficient: " cE
            if (abs(cI) > abs(cE)) {
                print "      Coefficient overflow: |" cI "| > |" cE "|"
            } else {
                print "      Coefficient within limit"
            }
            if (PROC_SIGN == "same" && (cI * cE < 0)) {
                print "      Sign mismatch: " cI " vs " cE
            } else {
                print "      Sign compatible"
            }
        } else if (PROC_MODE == "open") {
            shadow = compute_shadow(mono)
            if (shadow in E) {
                cE = E[shadow]
                print "    Open mode allowed (shadow: " shadow ")"
                print "      Shadow coefficient: " cE
                if (abs(cI) > abs(cE)) {
                    print "      Coefficient overflow: |" cI "| > |" cE "|"
                } else {
                    print "      Coefficient within shadow limit"
                }
            } else {
                print "    No shadow found for: " mono
            }
        } else {
            print "    Monomial not in envelope (closed mode)"
        }

        if (PROC_MAX_WDEG && monowdeg(mono) > PROC_MAX_WDEG) {
            print "    Procedure weighted degree exceeded: " monowdeg(mono) " > " PROC_MAX_WDEG
        } else if (PROC_MAX_WDEG) {
            print "    Procedure weighted degree within limit"
        }

        print ""
    }

    print "Procedure envelope:"
    n = sorted_keys(E, keys)
    for (i = 1; i <= n; i++) {
        m = keys[i]
        print "  " E[m] " * " m
    }
}

function repeat(str, n,    result, i) {
    result = ""
    for (i = 0; i < n; i++) {
        result = result str
    }
    return result
}

###################
# Helpers
###################
function monodeg(m,    n, a) {
    if (m == "") {
        return 0
    }
    n = split(m, a, ".")
    return n
}

function monowdeg(m,    n, i, a, deg) {
    if (m == "") {
        return 0
    }
    deg = 0
    n = split(m, a, ".")
    for (i = 1; i <= n; i++) {
        deg += ATOM_W[a[i]]
    }
    return deg
}

function abs(x) {
    return x < 0 ? -x : x
}

function max(a, b) {
    return a > b ? a : b
}

function file_exists(file) {
    return (system("test -f \"" file "\" 2>/dev/null") == 0)
}

function emit_trace(type, data) {
    print "#ALG", type, data >> TRACE_FILE
}
