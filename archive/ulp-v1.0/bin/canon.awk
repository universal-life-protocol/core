# bin/canon.awk
# Canonicalize identifier-only dotfiles:
# - NFC normalization is assumed external; we do stable whitespace + comment stripping.
# - Enforces identifier-only tokens (ASCII baseline).
# - Emits canonical lines: tokens joined by single space.

function trim(s){
    sub(/^[ \t\r\n]+/,"",s)
    sub(/[ \t\r\n]+$/,"",s)
    return s
}

function is_ident(s){
    return (s ~ /^[A-Za-z_][A-Za-z0-9_:\-\.]*$/)
}

{
    line=$0
    line=trim(line)
    if(line=="" || line ~ /^#/) next

    n=split(line,a,/[\t ]+/)
    out=""
    for(i=1;i<=n;i++){
        if(a[i]=="" ) continue
        if(!is_ident(a[i])){
            printf("error: non-identifier token: [%s]\n", a[i]) > "/dev/stderr"
            exit 2
        }
        out = (out=="" ? a[i] : out " " a[i])
    }
    if(out!="") print out
}
