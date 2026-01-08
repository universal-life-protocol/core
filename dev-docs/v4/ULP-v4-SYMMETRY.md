# ULP v4 .symmetry Spec (v3 Grammar + Semantics)

This document defines the `.symmetry` file format used to declare
meaning-preserving transformations under Δ.

## 1. EBNF (exact)

```
SymmetryFile    = SymmetryDecl, { Stmt }, "end", WS, "symmetry", NL ;

SymmetryDecl    = "symmetry", WS, "v3", NL ;

Stmt            = DeltaHash
                | Canon
                | DeltaProfile
                | DeltaWeights
                | DeltaThreshold
                | DeltaComponents
                | Transform
                | Invariant
                | Forbid
                | Portal
                | Comment
                | Blank ;

DeltaHash       = "delta", WS, "hash", WS, "sha256", NL ;

Canon           = "canon", WS, "json", WS, "v1", [WS, "strict"], NL ;

DeltaProfile    = "delta", WS, "profile", WS, Ident, NL ;

DeltaWeights    = "delta", WS, "weights", WS, WeightList, NL ;
WeightList      = WeightItem, { WS, WeightItem } ;
WeightItem      = ComponentName, "=", Number ;
ComponentName   = "set" | "order" | "quad" | "unit" | "kind" ;

DeltaThreshold  = "delta", WS, "threshold", WS, Number, NL ;

DeltaComponents = "delta", WS, "components", WS, ComponentList, NL ;
ComponentList   = ComponentName, { WS, ComponentName } ;

Transform       = "transform", WS, TransformName, WS, TransformMode, NL ;
TransformName   = "reorder" | "mirror" | "project" | "summarize" | "crop" | "redact" ;
TransformMode   = "allowed" | "forbidden" ;

Invariant       = "invariant", WS, InvariantName, NL ;
InvariantName   = "entry_hash_set" | "schema_shape" | "hash_chain" ;

Forbid          = "forbid", WS, ForbidName, NL ;
ForbidName      = "invent_entries" | "drop_entries" | "rewrite_entries" | "change_units" ;

Portal          = "portal", WS, PortalKey, WS, PortalVal, NL ;
PortalKey       = "enable" | "profile" | "threshold" | "require_kind" | "require_quadrant" ;
PortalVal       = Ident | Number ;

Comment         = ("#" | "//"), { any_char_except_NL }, NL ;
Blank           = { WS }, NL ;

Ident           = (ALPHA | "_"), { ALPHA | DIGIT | "_" | "-" } ;
Number          = DIGIT, { DIGIT }, [ ".", DIGIT, { DIGIT } ] ;

WS              = 1*(" " | "\t") ;
NL              = "\n" ;
ALPHA           = "A"…"Z" | "a"…"z" ;
DIGIT           = "0"…"9" ;
```

## 2. Normative semantics

### 2.1 Required statements

A valid `.symmetry` file MUST contain:

- `delta hash sha256`
- `canon json v1`
- `delta profile <name>`
- `delta threshold <number>`
- `delta weights ...`
- `delta components ...`

If any are missing, the runner MUST treat `.symmetry` as invalid and ignore it
(views MAY warn).

### 2.2 `delta hash sha256`

Locks `H(e)` to SHA-256 over `canon(e)` as defined in `ULP-v4-DELTA.md`.

### 2.3 `canon json v1`

Locks canonicalization to the byte-stable rules in `ULP-v4-DELTA.md`.

If `canon json v1 strict` is used, then `tags` and `refs` MUST be present
(possibly empty arrays) instead of omitted.

### 2.4 `delta profile <name>`

Selects a named Δ weight/threshold bundle. Runners MAY ship built-ins such as
`CONV_MIN` and `CONV_NARR`.

If a profile is named but not known, the runner MUST reject `.symmetry` as
invalid.

### 2.5 `delta weights ...`

Declares weights explicitly:

- all weights MUST be >= 0
- sum of weights MUST be 1.0 (within +/- 1e-9)
- keys MUST be subset of `{set, order, quad, unit, kind}`

### 2.6 `delta threshold <x>`

Overrides the profile default threshold. This tunes strictness without
changing weights.

### 2.7 `delta components ...`

Declares which components are active for `.symmetry` evaluation.

Components not listed MUST be treated as disabled (distance not computed;
weight effectively 0).

If `kind` is not listed, `d_kind` MUST NOT be computed.

### 2.8 `transform <name> allowed|forbidden`

Declares which transformations are in the allowed set `G`.

If a transformation is not mentioned, default is `forbidden`.

These do not execute anything; they only define which projections must
preserve meaning.

### 2.9 `invariant <name>`

Declares invariants the system asserts for allowed transformations.

Minimum meanings:

- `entry_hash_set`: allowed transforms MUST NOT change `Set(T)` unless explicitly
  permitted by forbids/portal rules
- `schema_shape`: allowed transforms MUST NOT violate `.schema` shape constraints
- `hash_chain`: allowed transforms MUST preserve trace hash-chain integrity
  (if `.record` uses chaining)

### 2.10 `forbid <name>`

Hard safety constraints for meaning:

- `invent_entries`: transformations MUST NOT add new entries
- `drop_entries`: transformations MUST NOT remove entries
- `rewrite_entries`: transformations MUST NOT change an entry's semantic core
- `change_units`: transformations MUST NOT change `unit` fields

These map directly onto whether `canon(e)` may change.

### 2.11 Portal rules (optional)

Portal rules make "portal collapse" normative without mixing with execution.

Example semantics:

- `portal enable yes|no`
- `portal profile CONV_NARR`
- `portal threshold 0.30`
- `portal require_kind STORY`
- `portal require_quadrant UNKNOWN_UNKNOWN`

A portal MAY be formed when:

- `portal enable yes`
- trace equivalence under the portal profile satisfies the portal threshold
- required kind/quadrant constraints match

Portals are ledger artifacts only (`.record`/`.view`), never authority.

## 3. Minimal .symmetry example (recommended default)

```
symmetry v3
delta hash sha256
canon json v1

delta profile CONV_MIN
delta weights set=0.40 order=0.10 quad=0.40 unit=0.10 kind=0
delta components set order quad unit
delta threshold 0

transform reorder allowed
transform redact allowed
transform summarize forbidden
transform project allowed

invariant entry_hash_set
invariant schema_shape
forbid invent_entries
forbid drop_entries
forbid rewrite_entries
forbid change_units

portal enable yes
portal profile CONV_NARR
portal threshold 0.30
portal require_kind STORY
portal require_quadrant UNKNOWN_UNKNOWN

end symmetry
```
