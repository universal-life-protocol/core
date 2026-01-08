type: template
name: listing-detailed
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
    - condition
    - category
    - brand
    - timestamp
  forbidden:
    - script
    - iframe

project:
  order:
    - title
    - price
    - category
    - brand
    - condition
    - description
    - location
    - contact
    - timestamp
  collapse_empty: false
  normalize_whitespace: true

render:
  layout: card
  emphasize:
    - title
    - price
    - description
  de_emphasize:
    - timestamp
  hide:
    - type

accessibility:
  min_contrast: 4.5
  font_scale: 1.0
  alt_text_required: false

metadata:
  version: 1.0.0
  description: Detailed view showing all available fields
  theme: detailed
