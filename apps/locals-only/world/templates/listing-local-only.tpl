type: template
name: listing-local-only
applies_to:
  type: listing

select:
  required:
    - title
    - location
  optional:
    - price
    - description
    - contact
  forbidden:
    - script

project:
  order:
    - location
    - title
    - price
    - description
    - contact
  collapse_empty: true
  normalize_whitespace: true

render:
  layout: card
  emphasize:
    - location
    - title
  de_emphasize:
    - price
  hide:
    - type
    - timestamp

accessibility:
  min_contrast: 4.5
  font_scale: 1.0
  alt_text_required: false

metadata:
  version: 1.0.0
  description: Location-first view for local buyers
  theme: local-focus
