type: template
name: listing-dark-mode
applies_to:
  type: listing

select:
  required:
    - type
    - title
  optional:
    - price
    - location
    - description
    - contact
  forbidden:
    - script
    - iframe

project:
  order:
    - title
    - price
    - location
    - description
    - contact
  collapse_empty: true
  normalize_whitespace: true

render:
  layout: card
  emphasize:
    - title
    - price
  de_emphasize:
    - contact
  hide:
    - type
    - timestamp

accessibility:
  min_contrast: 7.0
  font_scale: 1.0
  alt_text_required: false

metadata:
  version: 1.0.0
  description: Dark mode optimized template with high contrast
  theme: dark
