# Universal Life Protocol (ULP) - Self-Encoding Trace System

## ✓ System Successfully Built and Validated

This is a complete implementation of a self-encoding trace system that demonstrates:

1. **Self-Encoding**: Every trace contains the complete program that generated it
2. **Determinism**: Same inputs always produce identical traces
3. **Reproducibility**: Any trace can reconstruct the program and re-execute
4. **Pattern_Syntax**: Procedure definitions use delimiter-based scoping
5. **Multiset Validation**: Opening and closing signatures are validated

## Quick Start

### Run the system
```bash
echo -e 'hello\nworld' | ./bin/run.sh world out
# Output: wrote out/trace.log
```

### Reconstruct from trace
```bash
./bin/decode_trace.sh out/trace.log /path/to/output
# Rebuilds: /path/to/output/WORLD/ and /path/to/output/REPO/
```

### Re-execute reconstructed system
```bash
cd /path/to/output/REPO
echo -e 'hello\nworld' | ./bin/run.sh ../WORLD out2
```

### Validate determinism
```bash
cmp out/trace.log /path/to/output/REPO/out2/trace.log
# Should be byte-for-byte identical
```

### Run validation suite
```bash
./validate.sh
# Runs all system tests
```

## Architecture

### World Dotfiles (`world/`)
- `.genesis` - User and runtime metadata
- `.env` - Environment configuration
- `.schema`, `.atom`, `.manifest`, `.sequence` - Data type definitions
- `.procedure` - Procedure definitions with Pattern_Syntax
- `.interrupt` - Interrupt handler mappings
- `.include`, `.ignore` - Allowed/blocked names
- `.view` - Observer configuration
- `.record` - Recording metadata

### Interrupt Handlers (`interrupts/`)
- `PRINT.sh` - Echo stdin to stdout (demo handler)

### Core Utilities (`bin/`)
- `run.sh` - Main execution engine
- `hash.sh` - SHA-256 hashing
- `canon.awk` - Canonicalize identifier-only files
- `proc.awk` - Parse procedures with multiset validation
- `self_encode.sh` - Append self-encoding bundle to trace
- `decode_trace.sh` - Reconstruct files from trace
- `observe.sh` - View traces per `.view` specification
- `trace.awk` - Trace formatting utilities

## Trace Format

Each trace contains:

1. **Header**: version, entry procedure, world ID
2. **Execution records**: STDIN, CLAUSE, EXEC, STDOUT, STDERR, EXIT
3. **Self-encoding bundle**: MANIFEST, FILE, DATA, END_FILE records

## Key Fixes Applied

1. Fixed `proc.awk` to use in-memory sorting (Termux compatibility)
2. Fixed multiset validation logic
3. Fixed `.procedure` to have matching opening/closing signatures
4. Fixed `decode_trace.sh` to handle multi-line base64 properly
5. Fixed trace field structure for clean parsing

## Validation Results

All tests passed:
- ✓ World dotfiles validated
- ✓ Pattern_Syntax in procedures
- ✓ Multiset validation working
- ✓ Self-encoding bundle complete
- ✓ Reconstruction successful
- ✓ Determinism verified (byte-for-byte identical traces)

## Trace SHA256
```
ebb56a4614c1806ac09e87872316c03b1541f6deb93e89573dccb363594a6e7e
```

## File Structure
```
ulp/
├── world/          # World configuration dotfiles
├── interrupts/     # Interrupt handlers (.sh scripts)
├── bin/            # Core utilities (.sh and .awk)
├── out/            # Execution output (trace.log)
├── reconstructed/  # Decoded trace output
├── build.sh        # System build script
└── validate.sh     # Validation test suite
```

## License

This is a reference implementation of the Universal Life Protocol.
