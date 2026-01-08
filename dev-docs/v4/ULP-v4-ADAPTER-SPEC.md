# ULP v4 Adapter Spec (v3 -> v4 Projection)

This document defines a read-only adapter that projects v3 traces into the v4
projection layer. It does not modify traces or execution.

## 1. Purpose

Provide a deterministic, minimal bridge so existing v3 traces can be rendered
using the v4 renderer contract without changing the v3 core.

## 2. Inputs

Required:

- `trace.log` from v3 execution
- v3 world dotfiles (for `.schema` and `.view` lookup)

Optional:

- v3 projection outputs (if present) as view hints

## 3. Outputs

The adapter emits:

- A v4 canonical entry stream (Δ core entries)
- A derived `.view` stub (layout intent only)
- A derived `.symmetry` stub (default profile)

The adapter MUST NOT:

- Modify the original trace
- Inject new trace events
- Execute non-deterministic steps

## 4. Canonical entry mapping (normative)

Each v3 trace entry is mapped to a v4 semantic core entry:

```json
{
  "entry_id": "<stable>",
  "kind": "<mapped_kind>",
  "quadrant": "<mapped_quadrant>",
  "unit": "<mapped_unit>",
  "content": "<normalized_content>",
  "tags": ["..."],
  "refs": ["..."]
}
```

### 4.1 Required mapping rules

- `entry_id` MUST be stable across replays (prefer v3 row index + event type +
  content hash).
- `content` MUST be extracted from the v3 entry payload, decoded if required,
  and normalized per Δ rules.
- `tags` and `refs` MAY be empty; duplicates MUST be removed.

### 4.2 v3 trace field references (tab-separated)

ULP v3 trace records are tab-separated. The adapter MUST parse the following
core field patterns from `trace.log` (see `ulp-v3.0/bin/run.sh`):

- `STDIN\t n \t <line_no> \t text \t <escaped_text>`
- `STDOUT\t n \t <line_no> \t text \t <escaped_text>`
- `STDERR\t n \t <line_no> \t text \t <escaped_text>`
- `CLAUSE\t qid \t <qid> \t intr \t <interrupt>`
- `EXEC\t eid \t <eid> \t wid \t <wid> \t qid \t <qid> \t intr \t <interrupt>`
- `EXIT\t intr \t <interrupt> \t code \t <exit_code>`
- `ALG_*` records are emitted by `ulp-v3.0/bin/poly.awk` (treated as `META`)
  and appear as `#ALG\t<ALG_TYPE>\t<data...>`
- `DECOMP_*` records are emitted by `ulp-v3.0/bin/poly.awk` (treated as `META`)
  and appear as `#ALG\t<DECOMP_TYPE>\t<data...>`
- `POLICY`, `GEOMETRY`, `REPLICA` are metadata records (treated as `META`)

### 4.2.1 ALG_* record shapes (from `ulp-v3.0/bin/poly.awk`)

`poly.awk` emits algebra records into `algebra.log` as:

```
#ALG <TYPE> <data...>
```

Common shapes:

- `#ALG\tALG_ATOM\t<atom>\tweight\t<weight>`
- `#ALG\tALG_MANIFEST\tmax_degree\t<deg>`
- `#ALG\tALG_MANIFEST\tmax_wdegree\t<wdeg>`
- `#ALG\tALG_MANIFEST\tban_monomial_prefix\t<prefix>`
- `#ALG\tALG_INTERFACE\tdecompile_enabled`
- `#ALG\tALG_PROC\t<proc>\tversion\t<version>`
- `#ALG\tALG_PROC\t<proc>\tmode\t<closed|open>`
- `#ALG\tALG_PROC\t<proc>\tsign\t<same|any>`
- `#ALG\tALG_PROC\t<proc>\tmax_wdegree\t<wdeg>`
- `#ALG\tALG_PROC\t<proc>\tshadow\t<first_atom|longest_prefix>`
- `#ALG\tALG_PROC_POLY\t<coef>\t<monomial>`
- `#ALG\tALG_INTR\t<intr>\tversion\t<version>`
- `#ALG\tALG_INTR_POLY\t<intr>\t<coef>\t<monomial>`
- `#ALG\tALG_SHADOW\t<intr>\t<mono>\t<shadow_mono>`
- `#ALG\tALG_BIND\t<proc>\t<intr>\tok\t<0|1>\treason\t<reason>`

### 4.2.2 DECOMP_* record shapes (from `ulp-v3.0/bin/poly.awk`)

Decompile traces are emitted when interface decompile is enabled:

- `#ALG\tDECOMP_START\t<proc>`
- `#ALG\tDECOMP_EMIT_PROC\t<proc>`
- `#ALG\tDECOMP_EMIT_PROC_POLY\t<coef>\t<monomial>`
- `#ALG\tDECOMP_EMIT_INTR\t<intr>`
- `#ALG\tDECOMP_EMIT_INTR_POLY\t<intr>\t<coef>\t<monomial>`
- `#ALG\tDECOMP_END\t<proc>`

### 4.3 v3 event type -> kind (default)

| v3 entry | v4 kind |
| --- | --- |
| `STDIN` | `REQUEST` |
| `STDOUT` | `FACT` |
| `STDERR` | `FACT` |
| `CLAUSE` | `ASSERTION` |
| `EXEC` | `FACT` |
| `EXIT` | `FACT` |
| `ALG_*` | `META` |
| `POLICY` | `META` |
| `GEOMETRY` | `META` |
| `REPLICA` | `META` |

Runners MAY override this mapping via `.view` using a `map kind` block.

### 4.4 Quadrant mapping (default)

Quadrant defaults are conservative:

- `STDIN` -> `KU`
- `STDOUT` -> `KK`
- `STDERR` -> `KU`
- `CLAUSE` -> `KK`
- `EXEC` -> `KK`
- `EXIT` -> `KK`
- `ALG_*` -> `UK`
- `POLICY`/`GEOMETRY`/`REPLICA` -> `UK`

Runners MAY override this mapping via `.view`.

### 4.5 Unit mapping (default)

- Input events -> `other`
- Output events -> `self`
- Algebra/policy events -> `system`

## 5. Derived .view stub (minimal)

The adapter SHOULD emit a minimal `.view` that declares:

- `canvas infinite`
- `quadrant layout`
- `node` shape defaults

Example:

```
view v1
canvas infinite
layout quadrant
node default
  shape card
end node
end view
```

## 6. Derived .symmetry stub (minimal)

If no `.symmetry` is present, the adapter SHOULD emit:

```
symmetry v3
delta hash sha256
canon json v1
delta profile CONV_MIN
delta weights set=0.40 order=0.10 quad=0.40 unit=0.10 kind=0
delta components set order quad unit
delta threshold 0
transform reorder allowed
invariant entry_hash_set
forbid invent_entries
forbid drop_entries
forbid rewrite_entries
forbid change_units
end symmetry
```

## 7. Determinism requirements

Adapters MUST:

- Produce byte-identical outputs for identical inputs
- Avoid wall-clock timestamps and randomness
- Use stable sorting and canonical JSON rules

## 8. Compliance checklist

- Read-only projection (no trace mutation)
- Stable `entry_id` mapping
- Canonical Δ core output
- Default `.view` and `.symmetry` stubs when missing
- Deterministic output across machines
