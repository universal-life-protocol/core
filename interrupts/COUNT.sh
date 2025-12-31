#!/bin/sh
# COUNT - Count lines
# Effect: read stdin, count, write to stdout
wc -l | awk '{print $1 " lines"}'
