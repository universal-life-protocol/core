Got it. Here’s a **tight, POSIX-native extension spec** that adds:

1. **open-envelope mode**
2. **weighted atoms**
3. **bidirectional decompile traces**

…and shows exactly what changes in `.atom/.manifest/.procedure/.interrupt`, plus what to add to `poly.awk` and the trace stream.

---

# 1) Open-envelope mode

## 1.1 What “open” means

**Closed** (current): interrupts may only use monomials explicitly listed in the procedure envelope `E`.

**Open**: interrupts may introduce _new monomials_ not listed in `E`, **as long as they are derivable from the envelope’s basis and allowed by the manifest**, and they pass coefficient limits by “shadowing” to a basis term.

This keeps your rule: **procedure defines boundaries/constraints, not bindings**, and avoids enumerating everything up front.

## 1.2 Basis and derivability

Define:

- `BasisAtoms(P)` = atoms that appear in any monomial in `E` (procedure envelope)
- A monomial `m` is **derivable** under open mode iff:
    - every atom in `m` is in `BasisAtoms(P)` (or optionally in `BasisAtoms(P) ∪ ManifestAllowAtoms(P)` if you want “open includes manifest extras” later)
    - and `m` passes global `.manifest` constraints (degree cap, banned prefixes, etc.)
    - and `deg(m) ≤ max_degree(P)`

## 1.3 Coefficient envelope in open mode: shadow capacity

If `m ∉ supp(E)`, compute its **shadow** `shadow(m)` to a basis monomial that _is_ in `E`, and apply coefficient limits against that.

Simple, shippable shadow rule:

- `shadow(m) = first_atom(m)` (monomial of degree 1)
- i.e., `shadow(scope.order.bind) = scope`

Then coefficient constraint becomes:

- `abs(c_I(m)) ≤ abs(c_E(shadow(m)))`

Sign constraint:

- if `sign same`, then `sign(c_I(m))` must match `sign(c_E(shadow(m)))`

This is easy to implement and gives you a real “open” algebra without fancy rewriting.

### Optional later

You can define alternative shadows (e.g., longest prefix present in E).

---

# 2) Weighted atoms

This adds real “polynomial geometry” without requiring you to change everything.

## 2.1 Extend `.atom` syntax

Allow optional weight:

```
atom <name> [weight <int>]
```

Example:

```txt
atom scope weight 2
atom order weight 1
atom bind  weight 1
atom publish weight 3
atom redact weight 2
atom destroy weight 999
```

Default weight = 1.

## 2.2 Weighted degree

Replace `deg(m)=length(m)` with **weighted degree**:

- `wdeg(m) = Σ weight(atom_i)` for atoms in the monomial
- `wdeg(P) = max wdeg(m) over supp(P)`

Then degree constraints become:

- `wdeg(m) ≤ MAN_MAX_WDEG`
- `wdeg(m) ≤ PROC_MAX_WDEG`

Keep the old `max_degree` as syntactic degree if you want both; but simplest is:

- manifest uses `max_wdegree`
- procedure uses `max_wdegree`
- and you can keep `max_degree` as an additional cap

## 2.3 Why weights matter

- lets you make “expensive” operations rare/denied by default (`destroy` weight huge)
- expresses your “polynomial distribution” idea cleanly
- preserves purely compositional typing: it’s still just a constraint check

---

# 3) Bidirectional decompile traces

This is the “reverse flow” in a disciplined way.

## 3.1 Two-direction semantics

You already have “compile-like” direction:

- **FORWARD**: `.procedure + .interrupt + FS → traces (POINT)`

Add a reverse projector:

- **REVERSE**: `traces (POINT) → reconstructible intent artifacts`
    - canonical polynomial blocks (CPNF)
    - inferred interrupts
    - inferred envelope usage
    - scope slices

This does _not_ claim to reconstruct the mind. It reconstructs **the canonical algebraic artifacts** that created the POINT.

## 3.2 Add a new dotfile: `.interface` (optional) OR use `.schema`

You asked earlier about `.interface`. Here’s the safe version:

- `.interface` is **projection-only**, not authority.
- It describes output formats for reverse projections (e.g., emit `.interrupt` blocks, emit patch files, emit a summary).

If you don’t want a new file, embed this in `.schema` as “reverse projections”.

## 3.3 Trace events to add (minimal)

During evaluation/execution, emit:

**Compile-direction algebra records**

- `ALG_ATOM name weight`
- `ALG_MANIFEST max_wdegree ...`
- `ALG_PROC name mode sign max_wdegree`
- `ALG_PROC_POLY <CPNF>`
- `ALG_INTR name <CPNF>`
- `ALG_BIND proc intr ok reason`
- `ALG_SHADOW intr monomial shadow_monomial` (only in open mode)

**Decompile-direction records**

- `DECOMP_START point_id`
- `DECOMP_EMIT_INTR name <CPNF>` (reconstructed interrupt polynomial)
- `DECOMP_EMIT_PROC name <CPNF>` (reconstructed envelope)
- `DECOMP_EMIT_FILES …` (optional: paths emitted)
- `DECOMP_END`

Key property:

- Decompile output MUST be deterministic given the trace stream.

---

# 4) Updated grammars (diff-style)

## 4.1 `.manifest` additions

Add:

```
max_wdegree <int>
```

(You may keep `max_degree` too.)

## 4.2 `.procedure` additions

Add:

- `mode open|closed` (already)
- `max_wdegree <int>`
- optional `shadow first_atom|longest_prefix` (default `first_atom`)

Example:

```txt
procedure chat_pipeline v2
domain:
  +2 scope
  +1 publish
end domain

mode open
sign same
max_wdegree 6
shadow first_atom

end procedure
```

## 4.3 `.atom` additions

As above: optional weight.

---

# 5) Concrete open+weighted example (quick)

### `.atom`

```txt
atom scope weight 2
atom order weight 1
atom bind weight 1
atom publish weight 3
atom redact weight 2
```

### `.manifest`

```txt
manifest v2
max_wdegree 6
ban_monomial_prefix destroy
```

### `.procedure` (open)

```txt
procedure chat_pipeline v2
domain:
  +2 scope
  +1 publish
end domain
mode open
sign same
max_wdegree 6
shadow first_atom
end procedure
```

### `.interrupt` introduces a new monomial not in envelope

```txt
interrupt OPEN_OK v1
poly:
  +1 scope.order.bind
end poly
end interrupt
```

Check:

- atoms all in basis? (basis from envelope is {scope, publish}; **this would FAIL** under strict open-basis) To allow this, you decide the open basis rule:

**Option A (strict):** open allows only atoms seen in envelope → OPEN_OK inadmissible  
**Option B (manifest-open):** open allows any atoms in manifest, but shadow capacity limited by envelope → OPEN_OK admissible if shadow(scope.order.bind)=scope and abs(1) ≤ abs(E(scope)=2) and wdeg(scope.order.bind)=2+1+1=4 ≤ 6

I recommend **Option B** for “open” to feel real.

So in open mode, define:

- admissible atoms for open monomials = atoms allowed by manifest
- capacity is enforced by shadow against envelope

That matches your “container defines constraints” idea: it constrains via capacity, not via naming.

---

# 6) `poly.awk` changes (surgical)

Here’s exactly what to add/change to the skeleton you already have:

## 6.1 Parse atom weights

In `load_atoms()`:

- parse either: `atom NAME` or `atom NAME weight N`
- store `ATOM_W[NAME]=N` (default 1)

## 6.2 Weighted degree function

Replace `monodeg(m)` with:

- `monowdeg(m)` = sum `ATOM_W[a[i]]`

Keep `monodeg` too if you want both caps.

## 6.3 Parse `max_wdegree`, `shadow`, and `mode`

- `MAN_MAX_WDEG`
- `PROC_MAX_WDEG`
- `PROC_MODE` (closed/open)
- `PROC_SHADOW` (first_atom|longest_prefix)

## 6.4 Open-mode support check

When evaluating a monomial `mono`:

- if `mono in E`: use `cE=E[mono]`
- else if `PROC_MODE=="open"`:
    - compute `shadow = shadow_of(mono)`
    - if `!(shadow in E)`: fail `open_shadow_missing`
    - set `cE = E[shadow]`
    - emit `ALG_SHADOW` in output
- else (closed): fail `envelope_missing_monomial`

## 6.5 Capacity check unchanged

`abs(cI) ≤ abs(cE)` using either direct envelope coefficient or shadow coefficient.

## 6.6 Emit decompile traces (minimal)

Have `poly.awk` output deterministic “decompile blocks” that `run.sh` can pass through into `.ulp/log`.

At minimum:

- print canonical polynomials for proc/intr in stable form
- print BIND decisions + shadow mappings

Then a new script `bin/decomp.sh` (or a mode flag) can reconstruct `.procedure`/`.interrupt` files from `ALG_*` lines exactly.

---

# 7) Minimal `run.sh` wiring changes

- no changes to your BALL/POINT flow
- just include the new `ALG_SHADOW` + `ALG_ATOM weight` + degree policy lines in the trace header/footer
- optionally add a `--decompile` mode that reads the last POINT trace and emits:
    - `recovered.procedure`
    - `recovered.interrupt`

---

## What I recommend you lock first

To avoid drift, lock these decisions now:

1. **Open-mode atom admission**: choose **Option B** (manifest atoms allowed; envelope defines capacity via shadow).
2. **Shadow strategy**: start with `first_atom`; add `longest_prefix` later.
3. **Degree cap**: adopt `max_wdegree` as primary; keep `max_degree` optional.

If you want, I’ll respond next with:

- an updated concrete dotfile set that hits **open-mode + weights** plus a failing case (wdegree overflow), and
- an updated `poly.awk` skeleton with the open+weights logic implemented (still drop-in).