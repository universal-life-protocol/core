# Template System

**Templates are lenses, not laws**

> Templates let people agree on how to see something without forcing agreement on what it means.

---

## Core Principles

### The Invariant

**Templates are reproducible projections, not executable code, not authority, not policy.**

They exist to answer one question:

> "If I want to see this the same way you do, how?"

### The Five Rules (Never Violate These)

1. **Templates are records** — they propagate like any other content
2. **Templates are content-addressed** — identified by SHA-256 hash
3. **Templates are non-executable** — no scripts, no logic, no conditionals
4. **Templates do not affect truth** — they only affect presentation
5. **Templates are opt-in only** — participation is declared, never granted

---

## Template Anatomy

### Minimal Template Structure

```yaml
type: template
name: string

applies_to:
  type: string            # e.g. listing, reply

select:
  required: [fields]      # must exist
  optional: [fields]      # may exist
  forbidden: [fields]     # hard exclusion

project:
  order: [fields]         # field ordering
  collapse_empty: bool    # hide empty fields
  normalize_whitespace: bool

render:
  layout: card|list|map|text
  emphasize: [fields]     # highlight these
  de_emphasize: [fields]  # downplay these
  hide: [fields]          # never show

accessibility:
  min_contrast: number    # WCAG compliance
  font_scale: number      # text scaling
  alt_text_required: bool

metadata:
  version: string
  description: string
```

### What Templates CANNOT Do

Templates have **hard limits** to prevent abuse:

- ❌ No conditionals (`if`, `switch`, ternary)
- ❌ No loops (`for`, `while`, `map`)
- ❌ No expressions or computations
- ❌ No network access
- ❌ No time-dependent behavior
- ❌ No executable code (`script`, `eval`, `function`)
- ❌ No prototype manipulation

Templates can only **select** and **order** fields.

---

## Built-in Templates

### 1. Card (Default)

**File:** `world/templates/listing-card-default.tpl`

Full-featured card layout with all fields visible.

```yaml
render:
  layout: card
  emphasize: [title, price]
  de_emphasize: [timestamp]
```

**Use case:** Default browsing experience

### 2. Text Minimal

**File:** `world/templates/listing-text-minimal.tpl`

Plain text, minimal info, hides contact details.

```yaml
render:
  layout: text
  hide: [type, timestamp, contact]
accessibility:
  min_contrast: 7.0
```

**Use case:** Quick scanning, low-bandwidth

### 3. High Contrast (Accessibility)

**File:** `world/templates/listing-a11y-highcontrast.tpl`

Optimized for screen readers and visual impairments.

```yaml
accessibility:
  min_contrast: 7.0
  font_scale: 1.5
  alt_text_required: true
```

**Use case:** Accessibility-first viewing

### 4. List Compact

**File:** `world/templates/listing-list-compact.tpl`

Dense list view for browsing many items.

```yaml
render:
  layout: list
  hide: [description, contact, timestamp]
```

**Use case:** High-density feed, mobile

---

## Template Composition

### Base + Override Pattern

Templates can compose (but not inherit).

**Base Template:**

```yaml
type: template
name: listing-base
select:
  required: [title, timestamp]
render:
  layout: text
```

**Override Template:**

```yaml
type: template
name: listing-enhanced
extends: sha256:BASE_TEMPLATE_HASH

render:
  layout: card
  emphasize: [title, price]
```

### Composition Rules

1. **Base is applied first**
2. **Override may:**
   - Reorder fields
   - Change layout
   - Add emphasis
3. **Override may NOT:**
   - Add required fields
   - Relax forbidden fields
   - Change `applies_to.type`
   - Weaken accessibility settings

Composition is **safe by default**.

---

## Using Templates

### Local Selection (world/.template)

Your personal template preferences:

```yaml
# Primary template (used by default)
primary: sha256:listing-card-default

# Fallback template (if primary unavailable)
fallback: sha256:listing-text-minimal

# Auto-apply rules
auto_apply:
  - type: listing
    template: sha256:listing-card-default
```

### In the UI

1. **Select template** from dropdown
2. **Create & publish** custom templates
3. **Switch views** without affecting data

Templates are **client-side only** — your choice never propagates.

---

## Template Propagation

### MQTT Topic

Templates travel over:

```
locals/template
```

Just like listings, they're published as records:

```json
{
  "rid": "sha256:...",
  "bytes": "CANONICAL_TEMPLATE_TEXT",
  "created": "2026-01-02T12:00:00Z",
  "type": "template"
}
```

### Trust Model

You decide which templates to apply:

```yaml
# Trust specific sources
trusted_template_sources:
  - sha256:trusted-creator-rid

# Block specific templates
blocked_templates:
  - sha256:bad-template-rid
```

There is **no official template authority**.

---

## Creating Templates

### Via UI

1. Click "Create & Publish Template"
2. Write template in YAML format
3. Click "Publish Template"
4. Template is:
   - Validated (security check)
   - Content-addressed (SHA-256)
   - Stored locally
   - Published to MQTT

### Via File

1. Create `.tpl` file in `world/templates/`
2. Refresh the app
3. Template auto-loads on startup

### Validation

Before publishing, templates are checked for:

- Correct structure
- No forbidden patterns
- No executable code
- Valid field references

**If validation fails, the template is rejected.**

---

## Security

### Defense in Depth

1. **No execution** — templates are declarative YAML, never evaluated
2. **Pattern blocking** — forbidden keywords (`script`, `eval`, etc.)
3. **Sandboxed rendering** — HTML is escaped, no injection
4. **Local trust** — you choose which templates to use
5. **Immutability** — templates can't be changed, only replaced

### Threat Model

**What templates CANNOT do:**

- Execute JavaScript
- Access cookies, localStorage, or APIs
- Modify the DOM directly
- Read other records
- Communicate with external servers

**Worst case:** Ugly layout, locally ignored.

---

## Determinism Guarantee

If two clients have:

- Same record RID
- Same template RID

They **must render identically**.

This is:

- ✓ Testable
- ✓ Verifiable
- ✓ The only guarantee provided

---

## Categories = Templates

There is **no category system**.

Categories are just templates with tight selectors:

```yaml
type: template
name: tools-only
applies_to:
  type: listing

select:
  required: [title, price]
  optional: [brand, condition]
  forbidden: [crypto, nft]
```

Browse "tools" by selecting this template.

**No global taxonomy. No moderators. No category owners.**

---

## Accessibility First

Accessibility is **projection, not metadata**.

### Screen Reader Template

```yaml
accessibility:
  min_contrast: 7
  font_scale: 1.5
  alt_text_required: true

render:
  layout: text
```

Two users can see the same record:

- One as a visual card
- One as high-contrast text

**Neither is "wrong".**

---

## Philosophy

### Why Templates Work

Because you removed **consensus from meaning**.

Most decentralized systems fail because they require agreement on:

- ❌ Moderation
- ❌ Ranking
- ❌ Reputation
- ❌ Categories

You only require agreement on:

- ✓ Record immutability
- ✓ Content addressing
- ✓ Transport neutrality

**Everything else is client policy.**

---

## Examples

### Example 1: Price-First View

```yaml
type: template
name: price-first
applies_to:
  type: listing

project:
  order:
    - price
    - title
    - location

render:
  layout: list
  emphasize: [price]
```

### Example 2: Privacy Mode

```yaml
type: template
name: privacy
applies_to:
  type: listing

render:
  hide:
    - contact
    - location
    - timestamp
```

### Example 3: Map View (Future)

```yaml
type: template
name: map-view
applies_to:
  type: listing

select:
  required: [title, location]

render:
  layout: map
  emphasize: [location]
```

---

## Testing

Run the template test suite:

```bash
open test-templates.html
```

Tests verify:

- ✓ Template validation
- ✓ Security (malicious pattern blocking)
- ✓ Template application
- ✓ Composition safety
- ✓ Field filtering
- ✓ Forbidden field blocking
- ✓ Deterministic hashing
- ✓ Accessibility preservation

---

## FAQ

### Q: Can templates execute code?

**No.** Templates are pure YAML. No logic, no execution.

### Q: Can I trust templates from others?

**You decide.** Use `trusted_template_sources` to allowlist.

### Q: What if a template is malicious?

**It can't be.** All dangerous patterns are blocked. Worst case: ugly rendering.

### Q: Do templates affect the network?

**No.** Templates are local lenses. Your view choice never propagates.

### Q: Can templates be updated?

**No.** Templates are immutable. Create a new version = new RID.

### Q: How do I share a template?

Publish to `locals/template`. Others can choose to apply it.

---

## Next Steps

1. **Explore built-in templates** in `world/templates/`
2. **Create your own** via the UI
3. **Publish and share** with the network
4. **Build advanced templates** (map view, graph view)

---

**Remember:**

> Records carry truth, templates carry agreement, clients carry meaning.

That sentence is the whole architecture.
