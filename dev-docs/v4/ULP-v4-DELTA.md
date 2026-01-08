# ULP v4 Delta (Δ) Definition

This document defines the fully computable semantic distance function Δ used by
`.symmetry` to judge meaning-preserving transformations. It is deterministic,
byte-stable, and independent of execution.

## 1. Data model

A trace `T` is an ordered list of entries:

```
T = [e1, e2, ... , en]
```

Each entry `e` MUST have a semantic core that Δ operates on:

```json
{
  "entry_id": "string",
  "kind": "FACT|QUESTION|COMMITMENT|REQUEST|OFFER|STORY|CONSENT",
  "quadrant": "KNOWN_KNOWN|KNOWN_UNKNOWN|UNKNOWN_KNOWN|UNKNOWN_UNKNOWN",
  "unit": "self|other|system",
  "content": "string",
  "tags": ["string"],
  "refs": ["string"]
}
```

All other fields are ignored by Δ.

## 2. Canonicalization `canon(e)` (byte-stable JSON)

`canon(e)` is the UTF-8 bytes of a canonical JSON encoding of the semantic
core.

### Canonicalization rules (normative)

Given semantic-core JSON object `e`:

1. Key set: Only the keys shown in the model are included. Unknown keys MUST
   be dropped for Δ.
2. Key order: Keys MUST be serialized in this exact order:
   `entry_id, kind, quadrant, unit, content, tags, refs`
3. String normalization:
   - `content` MUST be trimmed of leading/trailing whitespace.
   - internal runs of whitespace in `content` MUST be collapsed to a single
     ASCII space (0x20).
4. Arrays as sets (`tags`, `refs`):
   - remove duplicates (byte-equality)
   - sort ascending by raw UTF-8 byte order
5. Omit empties:
   - If `tags` is empty after normalization, omit `tags`
   - If `refs` is empty after normalization, omit `refs`
6. JSON serialization:
   - UTF-8, no BOM
   - minimal JSON: no extra spaces/newlines
   - strings MUST use JSON escapes where required
   - numbers are not used in this core

Result:

```
canon(e) -> byte_string
```

## 3. Entry hash `H(e)`

`H` is fixed:

```
H(e) = SHA-256(canon(e))    # hex lowercase
```

This is the sole identity primitive for Δ.

## 4. Trace views used by Δ

Given a trace `T`:

```
Seq(T) = [H(e1), H(e2), ... , H(en)]  # ordered sequence
Set(T) = {H(e) | e in T}              # set of hashes
```

Additionally define lookup maps (by entry hash):

```
Q_T[h] = quadrant(e)  where h = H(e)
U_T[h] = unit(e)
K_T[h] = kind(e)
```

## 5. Component distances (all computable)

Let two traces be `A` and `B`.

### (a) Set distance `d_set`

Jaccard distance on hash sets:

```
d_set(A,B) = 1 - |Set(A) ∩ Set(B)| / |Set(A) ∪ Set(B)|
```

If both sets are empty, define `d_set = 0`.

### (b) Order distance `d_order`

Normalized edit distance on hash sequences:

```
d_order(A,B) = Levenshtein(Seq(A), Seq(B)) / max(|Seq(A)|, |Seq(B)|, 1)
```

Levenshtein is standard insert/delete/substitute with unit costs.

### (c) Quadrant mismatch `d_quad`

Mismatch rate over shared entries:

Let `I = Set(A) ∩ Set(B)`.

If `|I| = 0`, define `d_quad = 1`.

Else:

```
d_quad(A,B) = (# of h in I where Q_A[h] != Q_B[h]) / |I|
```

### (d) Unit mismatch `d_unit`

If `|I| = 0`, define `d_unit = 1`.

Else:

```
d_unit(A,B) = (# of h in I where U_A[h] != U_B[h]) / |I|
```

### (e) Kind mismatch `d_kind` (optional)

If `|I| = 0`, define `d_kind = 1`.

Else:

```
d_kind(A,B) = (# of h in I where K_A[h] != K_B[h]) / |I|
```

## 6. Δ profile definition

A Δ profile is:

```json
{
  "profile": "CONV_MIN",
  "threshold": 0.0,
  "components": {
    "set":   0.40,
    "order": 0.10,
    "quad":  0.40,
    "unit":  0.10,
    "kind":  0.00
  }
}
```

Constraints:

- All weights MUST be non-negative reals
- Sum of weights MUST equal 1.0 (within +/- 1e-9)
- Components not listed are treated as weight 0

## 7. Final Δ function

Given profile weights `w_*`:

```
Δ(A,B) =
  w_set   * d_set(A,B)   +
  w_order * d_order(A,B) +
  w_quad  * d_quad(A,B)  +
  w_unit  * d_unit(A,B)  +
  w_kind  * d_kind(A,B)
```

Equivalence under a profile `P`:

```
Equivalent_P(A,B)  iff  Δ(A,B) <= P.threshold
```

## 8. Δ under transformations (what .symmetry controls)

A transformation `t` is a computable function over traces:

```
t : Trace -> Trace
```

`.symmetry` defines an allowed set `G` of transformations and a Δ profile `P`.

A trace `T` is invariant under a transformation `t` (relative to `P`) iff:

```
Δ(T, t(T)) <= P.threshold
```

A `.symmetry` policy typically asserts invariance over a set:

```
For all t in G: Δ(T, t(T)) <= threshold
```

This is the formal "kernel of meaning-preserving projections."
