type: template
name: listing-text-minimal
applies_to:
  type: listing

select:
  required:
    - title
  optional:
    - price
    - location
    - description
  forbidden:
    - script
    - iframe

project:
  order:
    - title
    - price
    - location
    - description
  collapse_empty: true
  normalize_whitespace: true

render:
  layout: text
  emphasize:
    - title
  de_emphasize: []
  hide:
    - type
    - timestamp
    - contact

accessibility:
  min_contrast: 7.0
  font_scale: 1.0
  alt_text_required: false

metadata:
  version: 1.0.0
  description: Minimal text-only layout for listings
