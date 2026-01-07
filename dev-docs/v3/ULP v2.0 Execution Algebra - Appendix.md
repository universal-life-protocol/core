Locked: **Domain Option 2 (coefficient envelope)**. Below is (1) the **Domain Option 2 semantics**, (2) a concrete **EBNF** for `.procedure` / `.interrupt` (compatible with your current “proc.awk parses clause-y text” vibe), and (3) a **drop-in `bin/poly.awk` design outline** that fits your current `bin/` layout and keeps ULP v2.0 invariants intact (BALL/POINT, determinism, dotfiles-only authority).

---

## 1) Domain Option 2: Coefficient Envelope Semantics

### 1.1 Objects

- Let **Σ** be the set of atoms from `.atom`.
- Let a **monomial** `m` be an ordered sequence of atoms: `a1.a2...ak`.
- Let a **polynomial** be a map `P: monomial → integer coefficient`.

Define:

- `supp(P)` = set of monomials with nonzero coefficient
- `deg(m)` = number of atoms in `m`
- `deg(P)` = max deg over `supp(P)` (or 0 if empty)

### 1.2 Procedure declares an envelope

A procedure defines an **envelope polynomial** `E` (your domain), plus optional flags:

- `max_degree D` (required or inherited from `.manifest`)
- `mode` (optional): `closed` or `open`

**Closed envelope (default)**:

- Only monomials present in `E` are admissible.

**Open envelope**:

- Monomials not in `E` may be admissible if they are **derivable** under `.manifest` rules _and_ do not violate coefficient limits for their “basis shadow”. (You can add this later; I recommend shipping `closed` first, then add `open`.)

### 1.3 Interrupt proposes a fragment

Interrupt defines a polynomial `I` (can have multiple terms).

### 1.4 Binding/admissibility rule (Closed Envelope, v1)

An interrupt `I` is admissible in procedure envelope `E` iff:

1. **Atom validity**  
    Every atom used in `supp(I)` must be in Σ.
    
2. **Manifest validity**  
    Every monomial used in `supp(I)` satisfies global `.manifest` constraints (degree cap, banned prefixes, allowed alphabets, etc.).
    
3. **Envelope support constraint**  
    `supp(I) ⊆ supp(E)` (closed mode)
    
4. **Coefficient constraint**  
    For every monomial `m` in `supp(I)`:
    

- `abs(c_I(m)) ≤ abs(c_E(m))`
- and sign compatibility if you enable it (optional):
    - either `sign(c_I(m)) == sign(c_E(m))` OR `E` declares `sign: any`

5. **Degree constraint**  
    `deg(I) ≤ max_degree` (also implied by manifest)

If all pass → **admissible**, else **inadmissible** with a deterministic reason code.

> Why this matches your “container defines boundaries” stance:  
> The procedure doesn’t list “allowed interrupts.” It just defines an envelope in a formal space. Interrupts are just coefficient injections. The check is pure evaluation against constraints, consistent with ULP v2.0 “policy derived, dotfiles define behavior.”

---

## 2) Canonical Polynomial Normal Form (CPNF) Recap (needed for determinism)

You’ll keep the earlier CPNF rules, because your determinism tests and self-encoding demands require unique serialization.

**Canonical term form**

- monomial: `atom(.atom)*`
- coefficient: signed integer; store as `sign` + `abs`
- store polynomial as map (combine duplicates)
- remove zero terms

**Canonical ordering of terms**

- primary: `deg(m)` ascending
- secondary: lexicographic byte order of monomial string

**Canonical serialization**

- one term per line:
    - `+<n> <monomial>`
    - `-<n> <monomial>`
- trailing newline

---

## 3) Concrete `.procedure` and `.interrupt` EBNF

This grammar is designed to be:

- easy to parse in AWK line-by-line
- stable for canonicalization
- compatible with your “clause-like” style (openSig/closeSig in trace) but simpler

### 3.1 Lexical tokens

```
NL        = "\n" ;
WS        = (" " | "\t")+ ;
OPTWS     = (" " | "\t")* ;
NAMECHAR  = "A".."Z" | "a".."z" | "0".."9" | "_" | "-" | "." ;
NAME      = NAMECHAR, { NAMECHAR } ;
INT       = ["+"|"-"], DIGIT, { DIGIT } ;
DIGIT     = "0".."9" ;

ATOM      = NAME ;              (* must be declared in .atom *)
MONOMIAL  = ATOM, { ".", ATOM } ;
```

### 3.2 `.procedure` file EBNF

```
ProcedureFile  = { Blank | Comment | ProcedureDecl } ;

ProcedureDecl  = "procedure", WS, ProcName, OPTWS, [WS, "v", Version], NL,
                 { ProcLine } ;

ProcName       = NAME ;
Version        = DIGIT, { DIGIT | "." } ;

ProcLine       = ( EnvelopeBlock
                 | MaxDegreeLine
                 | ModeLine
                 | SignLine
                 | EndProcedure
                 | Blank
                 | Comment );

EnvelopeBlock  = "domain", OPTWS, ":", NL,
                 { PolyTermLine },
                 "end", WS, "domain", NL ;

PolyTermLine   = OPTWS, PolyTerm, NL ;
PolyTerm       = Coef, WS, Monomial ;
Coef           = INT ;
Monomial       = MONOMIAL ;

MaxDegreeLine  = "max_degree", WS, DIGIT, { DIGIT }, NL ;

ModeLine       = "mode", WS, ("closed" | "open"), NL ;

SignLine       = "sign", WS, ("same" | "any"), NL ;

EndProcedure   = "end", WS, "procedure", NL ;

Blank          = OPTWS, NL ;
Comment        = OPTWS, ("#" | ";"), { ANYCHAR - NL }, NL ;
```

Notes:

- `domain:` … `end domain` is the polynomial envelope `E`.
- `mode closed` is your initial shippable Option 2 implementation.
- `sign same` is default; `sign any` relaxes sign compatibility.

### 3.3 `.interrupt` file EBNF

```
InterruptFile  = { Blank | Comment | InterruptDecl } ;

InterruptDecl  = "interrupt", WS, IntrName, OPTWS, [WS, "v", Version], NL,
                 { IntrLine } ;

IntrName       = NAME ;

IntrLine       = ( PolyBlock
                 | ScopeBlock
                 | EndInterrupt
                 | Blank
                 | Comment );

PolyBlock      = "poly", OPTWS, ":", NL,
                 { PolyTermLine },
                 "end", WS, "poly", NL ;

ScopeBlock     = "scope", OPTWS, ":", NL,
                 { ScopeLine },
                 "end", WS, "scope", NL ;

ScopeLine      = OPTWS, ("include" | "ignore"), WS, NAME, NL ;

EndInterrupt   = "end", WS, "interrupt", NL ;
```

Notes:

- `scope:` is optional per interrupt; **global** scope stays in `.include/.ignore`. This just allows interrupt-local constraints if you want.
- The interrupt polynomial is `I`.

---

## 4) Drop-in `bin/poly.awk` Design Outline

### 4.1 Where it sits in your layout

Your README lists `bin/proc.awk` as “Procedure parser (multiset validation)” and `bin/run.sh` as main execution engine.

Plan:

- Add `bin/poly.awk`
- Update `bin/run.sh` to call `poly.awk` instead of `proc.awk` (or call both during transition)
- Keep `bin/canon.sh`, `bin/policy.sh`, `bin/geometry.sh`, `bin/replica.sh` unchanged

### 4.2 Inputs and outputs

**Inputs** (paths passed as `-v` vars):

- `WORLD_DIR` (e.g., `world`)
- reads:
    - `$WORLD_DIR/.atom`
    - `$WORLD_DIR/.manifest`
    - `$WORLD_DIR/.procedure`
    - `$WORLD_DIR/.interrupt`
    - `$WORLD_DIR/.include`
    - `$WORLD_DIR/.ignore`

**Outputs** (deterministic):

1. A machine-readable plan on stdout:
    
    - canonicalized procedure envelopes
    - canonicalized interrupt polynomials
    - admissibility decisions + reason
    - final ordered list of runnable interrupts
2. Optional: a “trace snippet” block for `run.sh` to embed (ALG_* lines).
    

### 4.3 Core data structures in AWK (associative arrays)

- `ATOM[name]=1`

Manifest:

- `MAN_MAX_DEG`
- `MAN_BAN_PREFIX[prefix]=1` (optional)
- `MAN_ALLOW_SIGN = "same"|"any"` (optional)
- `MAN_MODE_DEFAULT = "closed"` (optional)

Procedure parsing:

- current procedure `p`
- `PROC_MAX_DEG[p]`
- `PROC_MODE[p]` (closed/open)
- `PROC_SIGN[p]`
- envelope coefficients: `E[p SUBSEP monomial] = coef`
- also keep `E_DEG[p SUBSEP monomial] = deg(monomial)` (precompute for ordering)

Interrupt parsing:

- current interrupt `i`
- `I[i SUBSEP monomial] = coef`
- `INTR_SCOPE_INCLUDE[i SUBSEP name]=1` (optional)
- `INTR_SCOPE_IGNORE[i SUBSEP name]=1` (optional)

Canonicalization helpers:

- `monomial_deg(m)` returns number of atoms (count dots + 1)
- `poly_add(map, key, delta)` combine coefficients, delete if 0
- `poly_terms(map, prefix)` enumerates keys for a given proc/interrupt

Decision results:

- `BIND_OK[p SUBSEP i]=1/0`
- `BIND_REASON[p SUBSEP i]="..."`

Runnable ordering:

- list `RUN[p, idx]=interruptName` with deterministic sort keys derived from polynomial:
    - `intr_degree = deg(I)` (max deg among terms)
    - `intr_key = canonical_poly_string(I)` or stable hash of it (but avoid non-POSIX)
    - chirality applied later in `run.sh` (or in awk if you already compute chirality there)

### 4.4 Parsing strategy (line-oriented state machine)

Pseudo-outline:

```awk
BEGIN {
  FS = "\n"; OFS="\t";
  # vars: WORLD_DIR
  load_atoms(WORLD_DIR "/.atom");
  load_manifest(WORLD_DIR "/.manifest");
  load_include_ignore(WORLD_DIR "/.include", WORLD_DIR "/.ignore");
  parse_procedures(WORLD_DIR "/.procedure");   # fills E[]
  parse_interrupts(WORLD_DIR "/.interrupt");   # fills I[]
  evaluate_all();                              # sets BIND_OK/REASON
  emit_plan();                                 # deterministic output
}
```

**Atom loader**

- accept lines like `atom NAME`
- ignore blanks/comments
- store `ATOM[NAME]=1`

**Manifest loader** (minimal for v1)

- parse:
    - `max_degree N`
    - `ban_monomial_prefix X` (optional)
    - `mode closed|open` default (optional)
    - `sign same|any` default (optional)

**Procedure parser**

- supports multiple procedures
- reads `procedure NAME ...` then `domain:` block
- each `PolyTermLine` parse:
    - `coef` integer
    - `monomial` string
    - validate monomial tokens exist in ATOM
    - canonicalize monomial (exact tokens, single dots)
    - add to `E[p, monomial] += coef`

**Interrupt parser**

- supports multiple interrupts
- reads `interrupt NAME ...` then `poly:` block
- add to `I[i, monomial] += coef`

### 4.5 Admissibility evaluation logic (Option 2 closed)

For each procedure `p` and interrupt `i`:

1. If `i` globally ignored or not included (respect `.include/.ignore`) → fail with reason `scope_excluded`.
2. For each monomial `m` in `supp(I_i)`:
    - `deg(m) <= MAN_MAX_DEG` and `<= PROC_MAX_DEG[p]`
    - check banned prefix: first atom in `m` not in `MAN_BAN_PREFIX`
    - check envelope support: `E[p,m]` exists (closed)
    - check coefficient envelope: `abs(I[i,m]) <= abs(E[p,m])`
    - check sign if `PROC_SIGN[p]=="same"`: `sign(I)==sign(E)` (unless coef is 0)
3. If all pass → `BIND_OK=1`, else `BIND_OK=0` with first deterministic failing reason.

Deterministic reasons (recommend stable codes):

- `scope_excluded`
- `unknown_atom`
- `manifest_degree_exceeded`
- `procedure_degree_exceeded`
- `manifest_ban_prefix_<x>`
- `envelope_missing_monomial`
- `envelope_coef_exceeded`
- `envelope_sign_mismatch`

### 4.6 Deterministic output format (for `run.sh`)

Emit in stable order:

- procedures sorted by name
- interrupts sorted by name
- monomials sorted by (deg, lex)

Example output:

```
PROC    chat_pipeline
PROC_MAX_DEG 3
PROC_MODE closed
PROC_SIGN same
PROC_TERM +2 scope
PROC_TERM +1 scope.order
...

INTR    EXTRACT_BLOCKS
INTR_TERM +1 scope.order
INTR_TERM +1 bind
...

BIND    chat_pipeline EXTRACT_BLOCKS ok 1 reason ok
BIND    chat_pipeline WIPE_HISTORY   ok 0 reason manifest_ban_prefix_destroy

RUN     chat_pipeline EXTRACT_BLOCKS
RUN     chat_pipeline PUBLISH_CHAT
```

Then `run.sh` simply:

- reads `RUN` lines
- executes corresponding scripts in `interrupts/` in that order
- writes the `ALG_*` trace lines before/after EXEC, alongside existing POLICY/GEOMETRY/REPLICA metadata

### 4.7 Where chirality fits

Your spec says chirality affects **ordering only**, never truth .

So:

- `poly.awk` emits a canonical “forward” run list.
- `run.sh` applies chirality to reverse that list when RIGHT.

That keeps policy logic centralized in the existing `policy.sh` flow.

---

## 5) Minimal edits to `bin/run.sh` (conceptual)

- After computing WID and before executing interrupts:
    1. call `bin/poly.awk -v WORLD_DIR="$WORLD" ...`
    2. parse `RUN` lines into list
    3. apply chirality order flip if RIGHT
    4. execute scripts exactly once, emitting trace lines

This is fully consistent with your existing Execution Rule `(BALL + input) → execute once → POINT` .

---

If you want the next step, I can produce:

- a concrete example `.atom/.manifest/.procedure/.interrupt` set that exercises coefficient envelopes (including sign mismatch and coefficient overflow cases), **and**
- a full `poly.awk` skeleton (real awk code, functions + parsing states) that you can drop into `bin/` and wire into `run.sh` with minimal changes.