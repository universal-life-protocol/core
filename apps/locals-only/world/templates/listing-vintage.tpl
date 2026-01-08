type: template
name: listing-vintage
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
    - condition
  forbidden:
    - script
    - iframe
    - eval

project:
  order:
    - title
    - price
    - condition
    - description
    - location
    - contact
    - timestamp
  collapse_empty: true
  normalize_whitespace: true

render:
  layout: card
  emphasize:
    - title
    - condition
  de_emphasize:
    - contact
    - timestamp
  hide:
    - type

accessibility:
  min_contrast: 4.5
  font_scale: 1.1
  alt_text_required: false

metadata:
  version: 1.0.0
  description: Vintage/retro aesthetic template with emphasis on item condition
  theme: vintage
