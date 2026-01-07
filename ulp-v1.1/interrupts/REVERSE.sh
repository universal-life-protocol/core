#!/bin/sh
# REVERSE - Reverse each line
# Effect: read stdin, reverse, write to stdout
while IFS= read -r line; do
    echo "$line" | rev
done
