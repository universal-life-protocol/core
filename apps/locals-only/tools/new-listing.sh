#!/bin/bash
# new-listing.sh
# Quick CLI tool to create a new listing record

set -e

echo "=== locals-only listing creator ==="
echo ""

# Collect listing data
read -p "Title: " title
read -p "Price: " price
read -p "Location: " location
read -p "Description: " description

# Generate timestamp
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Create listing content
listing="type: listing
title: $title
price: $price
location: $location
description: $description
timestamp: $timestamp"

# Output to stdout
echo ""
echo "=== Generated listing ==="
echo "$listing"
echo ""

# Optionally save to file
read -p "Save to file? (y/n): " save
if [ "$save" = "y" ]; then
  filename="listing-$(date +%s).txt"
  echo "$listing" > "$filename"
  echo "Saved to $filename"
fi
