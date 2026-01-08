type: template
name: listing-modern-minimal
applies_to:
  type: listing

select:
  required:
    - title
  optional:
    - price
    - location
  forbidden:
    - script
    - iframe

project:
  order:
    - title
    - price
    - location
  collapse_empty: true
  normalize_whitespace: true

render:
  layout: list
  emphasize:
    - title
  de_emphasize:
    - location
  hide:
    - type
    - timestamp
    - description
    - contact

accessibility:
  min_contrast: 7.0
  font_scale: 1.0
  alt_text_required: false

metadata:
  version: 1.0.0
  description: Ultra-minimal modern design, essential info only
  theme: modern
