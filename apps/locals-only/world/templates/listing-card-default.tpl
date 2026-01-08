type: template
name: listing-card-default
applies_to:
  type: listing

select:
  required:
    - type
    - title
    - timestamp
  optional:
    - price
    - location
    - description
    - contact
  forbidden:
    - script
    - iframe
    - eval

project:
  order:
    - title
    - price
    - location
    - description
    - contact
    - timestamp
  collapse_empty: true
  normalize_whitespace: true

render:
  layout: card
  emphasize:
    - title
    - price
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
  description: Default card layout for marketplace listings
