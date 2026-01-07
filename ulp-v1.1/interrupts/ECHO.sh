#!/bin/sh
# ECHO - Echo each line
# Effect: read stdin, write to stdout
while IFS= read -r line; do
    echo "$line"
done
