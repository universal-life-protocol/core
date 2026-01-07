# ULP v3.0 Core Specification (POSIX/awk reference)

Status: Normative

## 1. Purpose

ULP v3.0 defines a deterministic execution protocol where:

- **World dotfiles are the only authority**.
- **Execution is append-only** and produces a byte-stable trace.
- **(BALL + input) → POINT**: the world (BALL) and stdin fully determine the trace (POINT).

## 2. Required Structure

A world directory MUST contain the following dotfiles:

- `.genesis`
- `.env`
- `.schema`
- `.atom`
- `.manifest`
- `.sequence`
- `.include`
- `.ignore`
- `.interrupt`
- `.procedure`
- `.view`
- `.record`
- `.symmetry`

An interrupt handler MUST exist at `interrupts/NAME.sh` for any admitted interrupt.

## 3. World Identity (WID)

### 3.1 Canonicalization Rules

All dotfiles are canonicalized before hashing.

- General dotfiles: remove comments and blank lines, trim whitespace, sort lines.
- `.procedure` / `.interrupt`: canonical polynomial normal form (CPNF) is REQUIRED.

### 3.2 CPNF (Canonical Polynomial Normal Form)

CPNF requires:

1. Combine like monomials by summing coefficients.
2. Drop zero coefficients.
3. Order terms by:
   - primary: monomial length ascending
   - secondary: monomial lexicographic byte order
4. Serialize terms as `±c monomial`.

### 3.3 WID Calculation

The WID is `sha256(canonicalized_dotfiles)` where the canonicalized content is
concatenated in a fixed dotfile order.

## 4. Execution Algebra

### 4.1 Atoms and Weights

- Atoms are declared in `.atom`.
- Each atom has a weight `w(a)`, default 1.
- A monomial is an ordered sequence `a1.a2...ak`.

### 4.2 Manifest Constraints

`.manifest` MAY define:

- `max_degree N`
- `max_wdegree N`
- `ban_monomial_prefix X`

These constraints apply to all interrupts.

### 4.3 Procedure Envelope

`.procedure` defines a polynomial envelope `E` and constraints:

- `mode: closed | open`
- `sign: same | any`
- `max_wdegree N`
- `shadow: first_atom | longest_prefix`

### 4.4 Interrupt Fragment

`.interrupt` defines polynomial fragments `I` per interrupt name.

### 4.5 Admissibility

For each interrupt and each monomial `m` in its fragment:

1. All atoms in `m` MUST be declared in `.atom`.
2. Manifest constraints MUST pass.
3. If `mode=closed`, then `m` MUST exist in `E`.
4. If `mode=open` and `m` not in `E`, then:
   - `shadow(m)` MUST be in `E`.
   - capacity is `abs(E(shadow(m)))`.
5. Capacity constraint: `abs(I(m)) <= abs(E(m))` (or shadow).
6. Sign constraint: if `sign=same`, then `sign(I(m)) == sign(E(m))`.
7. Procedure `max_wdegree` MUST pass if defined.

Admissibility uses **first-failure-wins** in CPNF order.

## 5. Execution Flow

1. Compute WID from canonicalized dotfiles.
2. Emit trace header and BALL identity.
3. Evaluate algebra and emit `ALG_*` records.
4. Read stdin once and append `STDIN` records.
5. Execute each admissible interrupt exactly once.
6. Append stdout/stderr/exit records.
7. Compute RID as `sha256(trace)`.
8. Derive policy/geometry/replica metadata (see Section 6).
9. Append self-encoding bundle.
10. Publish `trace.log` atomically.

## 6. Policy, Geometry, Replica (v2 compatibility)

ULP v3.0 includes the v2 policy/geometry layer for compatibility:

- Policy seeds from RID: `E8L = sha256("E8L"||RID)`, `E8R = sha256("E8R"||RID)`.
- Chirality is derived from `byte1(E8L) XOR byte1(E8R)`.
- Geometry and replica slots are derived deterministically from E8 seeds.

These records are non-authoritative metadata and do not affect execution.

## 7. Trace Format

All trace records are tab-separated. Core records include:

- `HDR`
- `BALL`
- `STDIN`, `STDOUT`, `STDERR`
- `CLAUSE`, `EXEC`, `EXIT`
- `END`
- `ALG_*` algebra records
- `POLICY`, `GEOMETRY`, `REPLICA` metadata
- `MANIFEST`, `FILE`, `DATA`, `END_FILE` self-encoding

## 8. Determinism

Implementations MUST guarantee:

- Identical inputs and dotfiles produce byte-identical traces.
- Canonicalization of `.procedure` and `.interrupt` is stable.
- Interrupt evaluation and execution order are deterministic.

## 9. Error Handling

Implementations MUST fail fast with a non-zero exit code when:

- Required dotfiles are missing.
- Required tools are missing.
- Interrupt handlers are missing or non-executable.
- Algebra evaluation fails.

## 10. Views (.view)

Views define deterministic projections from traces into renderer-agnostic view
models. A view MUST NOT introduce inference, authority transfer, or mutation.
Views are projection-only and do not affect execution.

The v3.0 view format and octree navigation rules are specified in:

- `ULP-v3.0-VIEW.md`
