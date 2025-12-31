#!/bin/sh
set -eu

SERIES_DIR="/data/data/com.termux/files/home/universal-life-protocol/Conversation Series"
OUT_DIR="out/stories"

mkdir -p "$OUT_DIR"

echo "=== ENCODING ALL CONVERSATION SERIES ARTICLES ==="
echo ""

for i in I II III IV V VI VII VIII; do
    article="$SERIES_DIR/ARTICLE $i.md"
    if [ -f "$article" ]; then
        name="article_$(echo $i | tr '[:upper:]' '[:lower:]')"
        echo "Encoding: ARTICLE $i -> ${name}_encoded.txt"
        cat "$article" | ./interrupts/ENCODE_CONVERSATION_STORY.sh > "$OUT_DIR/${name}_encoded.txt" 2>/dev/null
        echo "✓ ${name} ($(wc -l < "$OUT_DIR/${name}_encoded.txt") lines)"
    fi
done

echo ""
echo "=== ALL ARTICLES ENCODED ==="
ls -lh "$OUT_DIR"
