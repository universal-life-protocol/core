# ULP v3.0 Grammar and Vocabulary

Status: Normative for the POSIX/awk core

## 1. Vocabulary

### 1.1 Atoms

- **Atom**: an identifier declared in `.atom`.
- **Atom weight**: optional `weight N` declaration for an atom (default 1).

### 1.2 Monomials

- **Monomial**: ordered sequence of atoms joined by `.` (dot).
  Example: `scope.order.bind`
- **Degree**: number of atoms in the monomial.
- **Weighted degree**: sum of atom weights.

### 1.3 Polynomials

- **Polynomial**: set of monomials with integer coefficients.
- **Coefficient**: signed integer with `+` or `-` prefix.

### 1.4 Procedure Envelope

- **Envelope**: polynomial in `.procedure` defining admissible capacity.
- **Mode**: `closed` or `open`.
- **Shadow**: `first_atom` or `longest_prefix` used in open mode.
- **Sign constraint**: `same` or `any`.

### 1.5 Interrupt Fragment

- **Interrupt**: named polynomial in `.interrupt` that proposes execution.
- **Admissibility**: algebraic acceptance of an interrupt fragment.

### 1.6 Trace Records (core)

- `HDR`, `BALL`, `STDIN`, `STDOUT`, `STDERR`, `CLAUSE`, `EXEC`, `EXIT`, `END`
- Algebra trace: `ALG_*`
- Metadata: `POLICY`, `GEOMETRY`, `REPLICA`
- Self-encoding: `MANIFEST`, `FILE`, `DATA`, `END_FILE`

## 2. Grammar (EBNF)

Identifiers and tokens:

```
IDENT   = /[A-Za-z_][A-Za-z0-9_]*/
INT     = /[+-][0-9]+/
ATOM    = IDENT
MONO    = ATOM ( "." ATOM )*
```

### 2.1 .atom

```
atom_file   = { atom_decl | comment | blank } ;
atom_decl   = "atom" WS ATOM [ WS "weight" WS INT_POS ] ;
INT_POS     = /[0-9]+/ ;
```

### 2.2 .manifest

```
manifest_file = { manifest_decl | comment | blank } ;
manifest_decl = max_degree | max_wdegree | ban_prefix ;
max_degree    = "max_degree" WS INT_POS ;
max_wdegree   = "max_wdegree" WS INT_POS ;
ban_prefix    = "ban_monomial_prefix" WS ATOM ;
```

### 2.3 .procedure

```
procedure_file =
  "procedure" WS IDENT WS "v3" NL
  domain_block
  { proc_directive }*
  "end" WS "procedure" NL ;

domain_block =
  "domain:" NL
  { term_line }*
  "end" WS "domain" NL ;

proc_directive =
  ( "mode" WS ("open" | "closed") ) NL |
  ( "sign" WS ("same" | "any") ) NL |
  ( "max_wdegree" WS INT_POS ) NL |
  ( "shadow" WS ("first_atom" | "longest_prefix") ) NL ;
```

### 2.4 .interrupt

```
interrupt_file = { interrupt_block | on_start | comment | blank } ;

on_start = "on_start" WS IDENT NL ;

interrupt_block =
  "interrupt" WS IDENT WS "v3" NL
  poly_block
  "end" WS "interrupt" NL ;

poly_block =
  "poly:" NL
  { term_line }*
  "end" WS "poly" NL ;
```

### 2.5 Polynomial term

```
term_line = WS? INT WS MONO NL ;
```

### 2.6 Comments and whitespace

```
comment = "#" { any_char } NL ;
blank   = WS? NL ;
WS      = (" " | "\t")+ ;
NL      = "\n" ;
```

### 2.7 .genesis

```
genesis_file = { genesis_pair | comment | blank } ;
genesis_pair = IDENT WS IDENT NL ;
```

### 2.8 .env

```
env_file = { env_pair | comment | blank } ;
env_pair = IDENT WS IDENT NL ;
```

### 2.9 .schema

```
schema_file = "schema" WS IDENT NL ;
```

### 2.10 .sequence

```
sequence_file =
  "sequence" WS IDENT NL
  { IDENT WS IDENT NL }* ;
```

### 2.11 .include / .ignore

```
include_file = { IDENT NL | comment | blank } ;
ignore_file  = { IDENT NL | comment | blank } ;
```

### 2.12 .view

```
view_file =
  "view" WS IDENT NL
  { view_line }* ;

view_line =
  observe_line |
  requires_line |
  version_line |
  status_line |
  invariant_line |
  order_line |
  unit_line |
  partition_line |
  projection_line |
  nav_line |
  time_bucket_line |
  topic_key_line |
  output_line |
  rule_block |
  overlay_line |
  octree_block |
  end_view ;

observe_line = "observe" WS IDENT WS "as" WS IDENT NL ;
requires_line = "requires" WS "interface" WS IDENT NL ;
version_line = "version" WS IDENT NL ;
status_line = "status" WS IDENT NL ;
invariant_line = "invariant" WS IDENT WS IDENT NL ;
order_line = "order" WS ("primary" | "secondary") WS IDENT NL ;
unit_line = "unit" WS IDENT WS "show" NL ;
partition_line = "partition" WS ("by" | "source") WS IDENT NL ;
projection_line = "projection" WS IDENT WS ("allowed" | "forbidden") NL ;
nav_line = "nav" WS IDENT WS ("enabled" | "disabled") NL ;
time_bucket_line = "time_bucket_seconds" WS INT_POS NL ;
topic_key_line = "topic_key_source" WS IDENT NL ;
output_line = "output" WS IDENT WS IDENT NL ;
overlay_line = "overlay" WS IDENT WS IDENT NL ;
end_view = "end" WS "view" NL ;

rule_block =
  "rule" WS IDENT ":" NL
  { ( "allow" | "forbid" ) WS IDENT WS IDENT NL }*
  "end" WS "rule" NL ;

octree_block =
  "octree" WS "root" ":" NL
  { octree_line }*
  "end" WS "octree" NL ;

octree_line =
  ( "axes:" NL ) |
  ( "-" WS IDENT NL ) |
  ( "depth_max" WS INT_POS NL ) ;
```

### 2.13 .record

```
record_file =
  "record" WS IDENT NL
  { "include" WS IDENT NL }* ;
```

### 2.14 .symmetry

```
symmetry_file =
  "symmetry" WS IDENT NL
  { symmetry_kv }*
  algebra_block
  "end" WS "symmetry" NL ;

symmetry_kv =
  ( "policy" WS IDENT ) NL |
  ( "projective" WS IDENT ) NL |
  ( "causality" WS IDENT ) NL |
  ( "incidence" WS IDENT ) NL |
  ( "replicas" WS INT_POS ) NL ;

algebra_block =
  "algebra:" NL
  { algebra_kv }*
  "end" WS "algebra" NL ;

algebra_kv =
  ( "mode" WS ("open" | "closed") ) NL |
  ( "weighted_atoms" WS ("yes" | "no") ) NL |
  ( "decompile_traces" WS ("yes" | "no") ) NL |
  ( "default_shadow" WS ("first_atom" | "longest_prefix") ) NL |
  ( "canonical_form" WS ("yes" | "no") ) NL ;
```

### 2.15 .interface (optional)

```
interface_file =
  "interface" WS IDENT NL
  { interface_kv }*
  outputs_block
  "end" WS "interface" NL ;

interface_kv =
  ( "decompile_mode" WS IDENT ) NL ;

outputs_block =
  "outputs:" NL
  { "-" WS IDENT NL }*
  "end" WS "outputs" NL ;
```

## 3. Canonicalization (CPNF)

- Combine like monomials by summing coefficients.
- Drop zero coefficients.
- Sort by monomial length ascending; then lexicographic order.
- Serialize each term as `±c monomial` with a leading sign.

## 4. Deterministic Ordering

- Procedure monomials: CPNF order.
- Interrupts: lexicographic by name.
- Interrupt monomials: CPNF order.
