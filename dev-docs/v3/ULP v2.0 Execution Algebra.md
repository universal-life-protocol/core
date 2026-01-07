Below is a **full write-up + refactor request** that (a) defines a **canonical polynomial normal form** for `.procedure` / `.interrupt` under your “container defines constraints, not bindings” rule, and (b) gives a **worked end-to-end example** in a real folder that shows admissible vs inadmissible interrupts. This is explicitly aligned with your ULP v2.0 Prime Rule (“dotfiles are the only axioms”) and BALL/POINT model.

---

# ULP v2.0 Execution Algebra

## Canonical Polynomial Normal Form for `.procedure` / `.interrupt`

### Status: Proposed v2.0-A (Execution Algebra Addendum)

## 0. Motivation

ULP v2.0 already defines:

- **BALL**: closed interior of constraints derived from dotfiles
- **POINT**: immutable record produced by execution exactly once
- **Dotfiles are identifier-only and define the system**

This addendum refactors the Execution layer so that:

- `.procedure` declares only **admissible algebraic space** (container constraints)
- `.interrupt` supplies only **polynomial terms / coefficients**
- Binding occurs by **admissibility evaluation** (type checking), not by explicit binding classes or allowlists inside `.procedure`.

The existing `.include/.ignore` remain valid as _global scope constraints_ (world-level policy), but `.procedure` itself does not “grant permission.”

---

# 1. Objects and Terms

## 1.1 Atoms and the Universe

- `.atom` defines **generators** (basis symbols).
- `.manifest` defines the **universe**: which atoms exist and what compositions are admissible globally (inventory + constraints).

A **World Algebra** is:

- a set of atoms `Σ`
- a set of admissible monomials `M ⊆ Σ*` (strings of atoms under a chosen monoid law)
- constraints on degree, sign, chirality, etc.

## 1.2 Monomials, Polynomials, and Degree

- A **monomial** is a finite ordered product of atoms:  
    `m := a1 ∘ a2 ∘ ... ∘ ak`, with each `ai ∈ Σ`.
    
- A **polynomial** is a multiset / map from monomials to integer coefficients:  
    `P := Σ (c_m · m)`, where `c_m ∈ ℤ`.
    
- Degree:
    
    - `deg(m) = length(m)` (number of atoms in product)
    - `deg(P) = max(deg(m)) over nonzero terms`

(You can later generalize to weighted degree via `.atom` weights; normal form still applies.)

---

# 2. Canonical Polynomial Normal Form (CPNF)

## 2.1 Why Normal Form

To guarantee determinism and byte-identical traces (your determinism test expectation), any polynomial written in `.procedure` / `.interrupt` must canonicalize to a unique representation before:

- hashing / WID canonicalization
- execution evaluation

This preserves the v2.0 “deterministic, self-encoding, policy-derived” compliance goals .

## 2.2 Chosen Normal Form

A polynomial is in **CPNF** iff all of the following hold:

### A) Atom canonicalization

Each atom name is canonical:

- trimmed
- ASCII recommended
- no whitespace
- stable case (recommend: exact as declared in `.atom`)

### B) Monomial canonicalization (token sequence)

Each monomial is represented as:

- ordered list of atom tokens joined by a single delimiter, e.g. `.`  
    Example: `scope.order.bind`

Order is **not commutative**. The sequence matters.

### C) Term canonicalization

- Any term with coefficient 0 is removed.
- Coefficients are integers in base 10.
- A term is serialized as:  
    `+<coef> <monomial>` or `-<coef> <monomial>`  
    with `<coef>` having no leading `+` inside; sign is separate.

Examples:

- `+1 scope`
- `-2 scope.order`
- `+10 bind.order`

### D) Polynomial canonical ordering (lexicographic)

Sort terms by:

1. **deg(m)** ascending (or descending—pick one and freeze; I recommend ascending for “inclusion reduces first”)
2. then **monomial string** lexicographically (byte order)
3. then coefficient sign/size doesn’t affect ordering (since monomial is unique key)

### E) Canonical serialization

The whole polynomial is serialized as a newline-separated list of terms in canonical order, with a trailing newline. Example:

```
+1 scope
+1 scope.order
-2 scope.order.bind
```

That’s the canonical byte sequence for hashing / signing / determinism.

---

# 3. `.procedure` and `.interrupt` Semantics

## 3.1 `.procedure` declares a Domain, not bindings

A `.procedure` declares an **admissible domain polynomial** plus constraints:

- **Domain polynomial** `Pdom` describes the “shape spectrum” the container admits.
- **Constraints** refine admissibility:
    - max degree
    - allowed atoms subset
    - allowed monomial prefixes
    - chirality constraints (optional)
    - sign constraints (optional)

`.procedure` MUST NOT:

- enumerate allowed interrupt names
- declare binding classes
- target specific interrupts

## 3.2 `.interrupt` supplies a polynomial fragment

An `.interrupt` declares `I`, a polynomial fragment representing the structural contribution / “coefficient injection” it wants to add.

`.interrupt` MUST NOT:

- name procedures it binds to
- require permission from `.procedure`

## 3.3 Binding rule (Admissibility)

Given:

- world universe `U` (from `.manifest`)
- procedure domain `Pdom`
- interrupt fragment `I`

The interrupt is **admissible** for the procedure iff:

1. **World admissibility**: all atoms used by `I` are in `.atom` and all monomials used by `I` are admissible under `.manifest` constraints.
    
2. **Procedure domain admissibility**:  
    For every monomial `m` in `I`, it must be admissible under the procedure’s domain constraints. Two practical domain checks:
    

### Domain Check Option 1 (basis envelope)

Let the procedure define an allowed set of monomials `M_P` (explicitly or derived). Then `support(I) ⊆ M_P`.

### Domain Check Option 2 (coefficient envelope)

Let `Pdom` be a polynomial with coefficient limits. Then for each monomial `m`:

- `abs(c_I(m)) ≤ abs(c_Pdom(m))` if `m` exists in `Pdom`
- or `c_Pdom(m)` implies allowed presence/absence (strict)

**Recommendation:** start with Option 1 for simplicity; upgrade to Option 2 later.

3. **Degree constraint**: `deg(I) ≤ deg_max(P)`

If all checks pass, interrupt participates; else it is inadmissible.

---

# 4. Worked End-to-End Example (Real Folder)

## 4.1 Folder Layout

```
myworld/
  .genesis
  .env
  .schema
  .atom
  .manifest
  .include
  .ignore
  .symmetry
  .procedure
  .interrupt
interrupts/
  EXTRACT_BLOCKS.sh
  PUBLISH_CHAT.sh
  WIPE_HISTORY.sh
out/
```

This matches the ULP v2.0 world+interrupts split and “execute once to produce a POINT” model .

## 4.2 `.atom` (generators)

```
atom scope
atom order
atom bind
atom redact
atom publish
atom destroy
```

## 4.3 `.manifest` (universe constraints)

Example constraints (lightweight, implementable in awk first):

```
manifest v1
allow atoms: scope order bind redact publish destroy
max_degree 3

# prohibit destructive atom in public pipelines
ban_monomial_prefix destroy
```

Meaning:

- Any monomial that begins with `destroy` is globally inadmissible.
- Degree of any monomial must be ≤ 3.

## 4.4 `.procedure` (domain)

Declare domain as an allowed monomial set (Option 1):

```
procedure chat_pipeline v1
domain:
  +1 scope
  +1 order
  +1 bind
  +1 publish
max_degree 3
```

Interpretation:

- This container admits interrupts that use these atoms and any monomial derived by admissible composition rules (up to degree 3), _subject to manifest constraints_.

(If you want stricter, enumerate allowed monomials explicitly.)

## 4.5 `.interrupt` entries (three interrupts)

Your `.interrupt` file can list named interrupts, each with a polynomial fragment. Example:

```
interrupt EXTRACT_BLOCKS
poly:
  +1 scope.order
  +1 bind

interrupt PUBLISH_CHAT
poly:
  +1 publish
  +1 scope

interrupt WIPE_HISTORY
poly:
  +1 destroy
```

Each `poly:` block is canonicalized into CPNF.

## 4.6 `.include/.ignore` (scope)

Keep your global boundaries:

`.include`:

```
EXTRACT_BLOCKS
PUBLISH_CHAT
WIPE_HISTORY
```

`.ignore`:

```
# empty (or put WIPE_HISTORY here to kill it globally)
```

Now evaluate admissibility per the algebra:

### A) `EXTRACT_BLOCKS`

- uses `scope.order` (degree 2) and `bind` (degree 1) ✅
- atoms are allowed ✅
- max_degree 3 ✅
- no `destroy` prefix ✅
- procedure domain includes atoms `scope, order, bind` ✅  
    **Result: admissible**

### B) `PUBLISH_CHAT`

- uses `publish` and `scope` ✅
- atoms are allowed ✅
- max_degree 3 ✅
- no `destroy` prefix ✅
- procedure domain includes `publish` ✅  
    **Result: admissible**

### C) `WIPE_HISTORY`

- uses `destroy` ❌  
    Violates `.manifest` ban prefix rule `destroy`  
    **Result: inadmissible** even if it’s listed in `.include`

That last detail is important: **global include does not override world algebra constraints**. The BALL constraints remain authoritative.

---

# 5. Refactor Request for Existing ULP v2.0 Implementation

Your current v2.0 reference implementation already has:

- canonicalization scripts (`canon.sh`)
- a procedure parser (`proc.awk`)
- a main engine (`run.sh`)
- determinism tests
- trace format & self-encoding goals

### Refactor Goal

Replace “procedure binds interrupts” parsing with:

- **CPNF parser**
- **admissibility evaluation**
- **execution order derived from chirality + inclusion + degree**

## 5.1 Required changes

### (1) Update `bin/proc.awk` → `bin/poly.awk`

New responsibilities:

- parse `.atom` into symbol table Σ
- parse `.manifest` into constraints:
    - `max_degree`
    - banned prefixes / banned atoms
    - optional allowed monomial regex (later)
- parse `.procedure` domain block
- parse `.interrupt` poly blocks
- canonicalize every polynomial into CPNF
- for each interrupt, compute `admissible(P, I, U)` boolean + reason

Output should be deterministic and stable (sorted list of admissible interrupts in evaluation order).

### (2) Update `bin/run.sh`

Replace “run interrupts through procedures” dispatch with:

1. Build BALL (WID) exactly as before.
2. Parse and canonicalize algebra.
3. Determine admissible interrupts.
4. Order interrupts:
    - primary: `deg(m)` ascending (inclusion-first)
    - secondary: chirality (LEFT forward / RIGHT reverse ordering) as you already do for ordering policy
5. Execute admissible interrupts once.
6. Emit trace:
    - include CPNF canonical polynomial blocks for:
        - procedure domain
        - each interrupt polynomial
        - admissibility decisions (yes/no + reason)
    - keep your POLICY/GEOMETRY/REPLICA metadata as-is

### (3) Trace format addition (minimal)

Add records like:

```
ALG_ATOM atom scope
ALG_ATOM atom order
ALG_MANIFEST max_degree 3
ALG_PROC name chat_pipeline
ALG_PROC_POLY <canonical lines...>
ALG_INTR name EXTRACT_BLOCKS
ALG_INTR_POLY <canonical lines...>
ALG_BIND intr EXTRACT_BLOCKS ok 1 reason <...>
ALG_BIND intr WIPE_HISTORY ok 0 reason manifest_ban_prefix_destroy
```

This preserves self-encoding and makes “why did/didn’t it run” replayable.

---

# 6. Implementation Notes (POSIX-native)

You can implement CPNF + admissibility with:

- awk (fast to ship)
- or C later (faster, safer)

Determinism requirements:

- stable sorting
- stable tokenization
- stable newline canonicalization

---

# 7. What I need from you (optional, but helpful)

If you want the evaluator to be minimal and unambiguous, pick **one** of these domain semantics to lock first:

- **Domain Option 1 (allowed monomials set)**: easiest, strictest
- **Domain Option 2 (coefficient envelope)**: more expressive, more mathy

If you don’t pick, I’d implement Option 1 first and add Option 2 later.

---

If you want, I can now take this spec and produce:

- a concrete `.procedure` / `.interrupt` grammar (EBNF)
- and a drop-in `poly.awk` design outline that fits your current `bin/` layout exactly.