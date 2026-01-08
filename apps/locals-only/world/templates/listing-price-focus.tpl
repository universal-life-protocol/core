type: template
name: listing-price-focus
applies_to:
  type: listing

select:
  required:
    - title
    - price
  optional:
    - location
    - condition
  forbidden:
    - script

project:
  order:
    - price
    - title
    - condition
    - location
  collapse_empty: true
  normalize_whitespace: true

render:
  layout: list
  emphasize:
    - price
  de_emphasize:
    - location
  hide:
    - type
    - timestamp
    - description
    - contact

accessibility:
  min_contrast: 4.5
  font_scale: 1.2
  alt_text_required: false

metadata:
  version: 1.0.0
  description: Price-first view for bargain hunters
  theme: price-focus
