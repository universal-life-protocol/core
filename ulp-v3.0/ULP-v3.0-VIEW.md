# ULP v3.0 View Specification

Status: Normative

## 1. Purpose

A `.view` defines deterministic projection rules from a trace into a renderer-
agnostic view model. A view MUST NOT introduce authority, inference, mutation,
or execution. Views are navigation and presentation only.

## 2. Core Constraints

Views MUST satisfy:

- projection-only: no inference, no authority transfer
- deterministic ordering
- reversible mapping (trace entries can be re-identified)
- unknown-unknown does not resolve or promote

## 3. View File Format

Minimal directives (order independent):

- `view <id>`
- `version <semver>`
- `status <label>`
- `requires interface <id>`
- `order primary <token>`
- `order secondary <token>`
- `unit <unit> show`
- `partition by <key>`
- `projection <name> allowed|forbidden`
- `nav octree enabled|disabled`
- `time_bucket_seconds <int>`
- `topic_key_source explicit_only`
- `output model <id>`

## 4. Canonical View Example (Quadrants + Octree)

```
view quadrants-octree.v3
version 3.0
status normative

requires interface testimony.v3

invariant projection_only true
invariant no_inference true
invariant no_mutation true
invariant stable_order true
invariant reversible true
invariant unknown_unknown_non_resolving true

order primary timestamp_asc
order secondary entry_id_lex

unit statement show
unit question show
unit narrative show
unit silence show
unit gesture show

partition by quadrant
partition source interface

projection web allowed
projection print allowed
projection text allowed
projection audio allowed

projection algorithmic forbidden
projection ranking forbidden
projection summarization forbidden
projection classification forbidden

rule unknown_unknown:
  allow display true
  allow annotate true
  forbid resolve true
  forbid promote_to_known true
end rule

overlay annotations allowed
overlay annotations authority none

nav octree enabled

octree root:
  axes:
    - quadrant
    - time_bucket
    - topic_key
  depth_max 6
end octree

time_bucket_seconds 86400
topic_key_source explicit_only

output model view_model.v3
output must_include:
  - header(trace_id, interface_id)
  - quadrant_sections(known_known, known_unknown, unknown_known, unknown_unknown)
  - entry_list(canonical_order)
  - nav_tree(if octree enabled)
  - hash_panel(trace_id)
end output

end view
```

## 5. View Model Contract (v3)

Renderers MUST produce a canonical view model JSON with:

- `view_model_version`
- `trace_id`
- `interface_id`
- `view_id`
- `generated_at` (from trace metadata)
- `order` (primary/secondary)
- `quadrants` map of entry ids
- `entries` (immutable atoms)
- `nav` (octree nodes if enabled)
- `hash_panel` (trace hash only)

No derived summaries, rankings, classifications, or inferred intent are allowed.

## 6. Octree Rule (Projection Only)

Octree nodes group entries by declared keys only:

- `quadrant` from interface
- `time_bucket` computed deterministically
- `topic_key` explicit-only (human-supplied)

An octree MUST NOT auto-classify or infer any field.

