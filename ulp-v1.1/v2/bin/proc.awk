# bin/proc.awk
# Parse .procedure and emit:
# CLAUSE <proc> <openSig> <closeSig> <intr>
# plus errors on invalid multiset.

function trim(s){
    sub(/^[ \t\r\n]+/,"",s)
    sub(/[ \t\r\n]+$/,"",s)
    return s
}

# Extract Pattern_Syntax payload: remove whitespace and identifier-ish chars.
function extract_sig(line, s){
    s=line
    gsub(/[ \t\r\n]/,"",s)
    gsub(/[A-Za-z0-9_:\-\.]/,"",s)
    return s
}

# Multiset key by sorting characters (order-insensitive)
function multiset_key(sig,    i,n,a,chars,sorted){
    # Simple in-memory sort instead of using temp files
    n=split(sig,a,"")
    # Build array of characters
    for(i=1;i<=n;i++){
        chars[i] = a[i]
    }
    # Bubble sort (good enough for small strings)
    for(i=1;i<=n;i++){
        for(j=i+1;j<=n;j++){
            if(chars[i] > chars[j]){
                tmp = chars[i]
                chars[i] = chars[j]
                chars[j] = tmp
            }
        }
    }
    # Build sorted key
    sorted=""
    for(i=1;i<=n;i++){
        sorted = sorted chars[i]
    }
    return sorted
}

BEGIN{
    cur=""
    nlines=0
}

{
    raw[++nlines]=$0
}

END{
    for(i=1;i<=nlines;i++){
        t=trim(raw[i])
        if(t=="" || t ~ /^#/) continue

        if(t ~ /^procedure[ \t]+/){
            split(t,a,/[\t ]+/)
            cur=a[2]
            continue
        }

        if(cur=="") continue

        if(t ~ /^interrupt[ \t]+/){
            split(t,a,/[\t ]+/)
            intr=a[2]

            # find nearest previous non-empty line for open
            j=i-1
            openLine=""
            while(j>=1){
                tt=trim(raw[j])
                if(tt=="" || tt ~ /^#/) { j--; continue }
                if(tt ~ /^procedure[ \t]+/) break
                openLine=raw[j]; break
            }

            # next non-empty line for close
            k=i+1
            closeLine=""
            while(k<=nlines){
                tt=trim(raw[k])
                if(tt=="" || tt ~ /^#/) { k++; continue }
                if(tt ~ /^interrupt[ \t]+/) break
                if(tt ~ /^procedure[ \t]+/) break
                closeLine=raw[k]; break
            }

            openSig=extract_sig(openLine)
            closeSig=extract_sig(closeLine)

            if(openSig=="" || closeSig==""){
                printf("error: missing open/close around interrupt %s in procedure %s\n", intr, cur) > "/dev/stderr"
                exit 6
            }

            if(multiset_key(openSig) != multiset_key(closeSig)){
                printf("error: scope multiset mismatch in %s: OPEN=[%s] CLOSE=[%s] INT=[%s]\n", cur, openSig, closeSig, intr) > "/dev/stderr"
                exit 7
            }

            print "CLAUSE", cur, openSig, closeSig, intr
        }
    }
}
