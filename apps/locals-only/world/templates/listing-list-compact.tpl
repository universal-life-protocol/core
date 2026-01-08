type: template
name: listing-list-compact
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
  min_contrast: 4.5
  font_scale: 1.0
  alt_text_required: false

metadata:
  version: 1.0.0
  description: Compact list view for browsing many listings
