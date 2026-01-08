# ULP v4.0 Reference Implementation (Projection Layer)

This is a minimal, read-only reference implementation for the v4 projection
layer. It does not execute worlds or mutate traces. It provides deterministic
tools to:

- Canonicalize trace entries for Δ
- Compute Δ between traces
- Adapt v3 `trace.log` into v4 semantic core entries

## Scope

- Additive to v1.1–v3.0
- Projection-only (no execution, no authority)
- Deterministic output for identical inputs

## Tools

- `bin/canon-core.mjs`: canonicalize semantic core entries and emit hashes
- `bin/delta.mjs`: compute Δ between two canonicalized traces
- `bin/adapter.mjs`: adapt v3 `trace.log` into v4 semantic core entries

## Usage

Adapt a v3 trace:

```
node bin/adapter.mjs --trace ../ulp-v3.0/out/trace.log --out /tmp/v4
```

Apply a kind map from a `.view` file:

```
node bin/adapter.mjs --trace ../ulp-v3.0/out/trace.log --out /tmp/v4 --view /path/to/.view
```

Example `map kind` block:

```
map kind
  STDIN REQUEST
  STDOUT FACT
  STDERR FACT
  CLAUSE STORY
  ALG_PROC META
  ALG_BIND META
end map
```

Common overrides:

- `CLAUSE`: use `COMMITMENT` or `STORY` depending on narrative intent
- `ALG_*`: map to `FACT` or `META` to control algebra visibility
- `POLICY`/`GEOMETRY`/`REPLICA`: map to `META` when hiding metadata

Outputs:

- `/tmp/v4/entries.jsonl` (semantic core entries)
- `/tmp/v4/entries.core.jsonl` (canonicalized + hashed)
- `/tmp/v4/view.stub`
- `/tmp/v4/symmetry.stub`

Compute Δ:

```
node bin/delta.mjs --a /tmp/v4/entries.core.jsonl --b /tmp/v4/entries.core.jsonl
```

Canonicalize a JSONL trace:

```
node bin/canon-core.mjs /path/to/entries.jsonl > /tmp/core.jsonl
```

## References

See:

- `dev-docs/v4/ULP-v4-DELTA.md`
- `dev-docs/v4/ULP-v4-SYMMETRY.md`
- `dev-docs/v4/ULP-v4-RENDERER-CONTRACT.md`
