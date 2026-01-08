type: template
name: listing-a11y-highcontrast
applies_to:
  type: listing

select:
  required:
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
    - description
    - location
    - contact
  collapse_empty: false
  normalize_whitespace: true

render:
  layout: text
  emphasize:
    - title
    - price
  de_emphasize: []
  hide:
    - type

accessibility:
  min_contrast: 7.0
  font_scale: 1.5
  alt_text_required: true

metadata:
  version: 1.0.0
  description: High-contrast accessibility template for screen readers
