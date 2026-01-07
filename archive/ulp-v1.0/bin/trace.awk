# bin/trace.awk
function esc(s){
    gsub(/\\/,"\\\\",s)
    gsub(/\t/,"\\t",s)
    gsub(/\r/,"\\r",s)
    gsub(/\n/,"\\n",s)
    return s
}

function emit2(k,a,b){
    printf("%s\t%s\t%s\n", k, esc(a), esc(b))
}

function emit3(k,a,b,c){
    printf("%s\t%s\t%s\t%s\n", k, esc(a), esc(b), esc(c))
}

function emitKV(k, key, val){
    printf("%s\t%s\t%s\n", k, esc(key), esc(val))
}
