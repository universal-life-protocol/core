# Contributing to ULP v1.1

Thank you for your interest in contributing to the Universal Life Protocol!

This document provides guidelines for contributing while preserving the **Five Immutable Principles** that define ULP v1.1.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [The Five Immutable Principles](#the-five-immutable-principles)
- [What Can Be Changed](#what-can-be-changed)
- [What Cannot Be Changed](#what-cannot-be-changed)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Testing Requirements](#testing-requirements)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Breaking Changes](#breaking-changes)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and respectful environment for all contributors, regardless of:
- Experience level
- Technical background
- Identity or background
- Perspective on ULP

### Our Standards

**Positive behaviors:**
- Using welcoming and inclusive language
- Respecting differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what's best for the community
- Showing empathy towards other community members

**Unacceptable behaviors:**
- Harassment or discriminatory language
- Trolling, insulting/derogatory comments, or personal attacks
- Public or private harassment
- Publishing others' private information
- Other conduct that would reasonably be considered inappropriate

### Enforcement

Violations may result in temporary or permanent bans from the project. Report issues to brian@universal-life-protocol.com.

## The Five Immutable Principles

All contributions **MUST** preserve these principles. Violations require v2.0+, not v1.x.

### 1. Trace is Append-Only and Authoritative

**What this means:**
- Traces are never mutated once written
- The trace is ground truth, not a log
- Deterministic: same inputs → byte-identical traces

**Implications for contributions:**
- ✓ Can improve trace formatting
- ✓ Can add trace validation tools
- ✗ Cannot allow trace mutation
- ✗ Cannot make traces non-deterministic

### 2. World Definition is Non-Executable

**What this means:**
- World files contain identifier-only data
- No control flow, no eval, no executable code
- Validated by `bin/canon.awk`

**Implications for contributions:**
- ✓ Can add new identifiers to world files
- ✓ Can improve validation tools
- ✗ Cannot make world files executable
- ✗ Cannot allow expressions or control flow in world

### 3. Projections are Pure Functions

**What this means:**
- π(Trace) → View
- Read-only, no side effects
- Deterministic: same trace → same view

**Implications for contributions:**
- ✓ Can add new projection implementations
- ✓ Can optimize projection performance
- ✗ Cannot make projections cause effects
- ✗ Cannot make projections modify traces

### 4. Effects are Forward-Only via .interpose

**What this means:**
- Effects declared in .interpose file
- EVENT → EFFECT mapping (declarative)
- No backward causation

**Implications for contributions:**
- ✓ Can add new effect types to closed set
- ✓ Can improve .interpose parsing
- ✗ Cannot allow backward effects
- ✗ Cannot make effects executable code

### 5. Information Flows Forward-Only

**What this means:**
- World → Trace → Projections
- Causal ordering preserved
- No information leakage backward

**Implications for contributions:**
- ✓ Can improve information flow visualization
- ✓ Can add flow validation tools
- ✗ Cannot allow projections to affect traces
- ✗ Cannot allow traces to modify worlds

## What Can Be Changed

### ✓ Allowed Contributions (v1.x)

**Bug Fixes:**
- Fix determinism issues
- Fix parsing errors
- Fix compatibility problems
- Fix documentation errors

**Performance Improvements:**
- Optimize awk scripts
- Reduce memory usage
- Speed up hash computations
- Improve file I/O

**New Projections:**
- Add implementations within the 16 sealed classes
- Optimize existing projections
- Add projection utilities

**Documentation:**
- Improve clarity
- Add examples
- Translate to other languages
- Add tutorials

**Testing:**
- Add test cases
- Improve test coverage
- Add platform-specific tests
- Add fuzzing tests

**Tooling:**
- IDE/editor integrations
- Visualization tools
- Debugging aids
- Trace analysis tools

**Platform Support:**
- Fix platform-specific bugs
- Improve portability
- Add platform-specific optimizations
- Improve Termux compatibility

**Examples:**
- Add interrupt handlers
- Add demonstration traces
- Add use case examples
- Add educational content

## What Cannot Be Changed

### ✗ Forbidden Changes (would require v2.0+)

**Architecture:**
- Modifying the Five Principles
- Changing the architecture hash
- Breaking determinism guarantees
- Adding new world file types (vocabulary is sealed at 13)
- Adding new trace event types (vocabulary is sealed at 16)
- Adding new projection classes (vocabulary is sealed at 16)

**Trace Format:**
- Changing tab-separated format
- Removing required sections
- Making traces mutable
- Breaking backward compatibility

**World Files:**
- Making them executable
- Allowing expressions or control flow
- Adding Turing-completeness

**Projections:**
- Making them impure (causing effects)
- Allowing non-determinism
- Breaking read-only constraint

## How to Contribute

### 1. Find or Create an Issue

Browse [existing issues](https://github.com/universal-life-protocol/ulp/issues) or create a new one.

**Good first issues:**
- Look for "good first issue" label
- Documentation improvements
- Adding examples
- Platform-specific testing

### 2. Discuss Before Major Work

For significant changes:
1. Open an issue describing the proposal
2. Discuss with maintainers
3. Ensure it preserves the Five Principles
4. Get approval before starting

### 3. Fork and Branch

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/ulp.git
cd ulp/ulp-v1.1

# Create a branch
git checkout -b feature/your-feature-name
```

### 4. Make Changes

Follow the [coding standards](#coding-standards) below.

### 5. Test Thoroughly

```bash
# Run the test suite
./validate.sh

# All tests must pass ✓
```

### 6. Commit with Clear Messages

```bash
git add .
git commit -m "Brief description of change

Detailed explanation of what changed and why.
Preserves Principle X by doing Y.

Fixes #123"
```

### 7. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a PR on GitHub.

## Development Setup

### Prerequisites

```bash
# Check requirements
which sh && echo "✓ Shell" || echo "✗ Need POSIX shell"
which awk && echo "✓ AWK" || echo "✗ Need AWK"
which sha256sum && echo "✓ Hash" || which shasum || which openssl
```

### Clone and Setup

```bash
git clone https://github.com/universal-life-protocol/ulp.git
cd ulp/ulp-v1.1

# Verify installation
./validate.sh
```

### Development Workflow

```bash
# 1. Make changes
vim bin/your_script.sh

# 2. Test immediately
./validate.sh

# 3. Test specific functionality
echo "test" | ./bin/run.sh world out
./bin/observe.sh world out/trace.log

# 4. Verify determinism
echo "test" | ./bin/run.sh world out1
echo "test" | ./bin/run.sh world out2
cmp out1/trace.log out2/trace.log

# 5. Check architecture compliance
./bin/verify_architecture.sh
```

## Testing Requirements

### All Contributions Must:

1. **Pass existing tests**
   ```bash
   ./validate.sh
   # All 8 tests must pass
   ```

2. **Maintain determinism**
   ```bash
   # Same input must produce byte-identical traces
   for i in 1 2 3; do
       echo "test" | ./bin/run.sh world "out$i"
   done
   cmp out1/trace.log out2/trace.log
   cmp out2/trace.log out3/trace.log
   ```

3. **Preserve self-encoding**
   ```bash
   echo "test" | ./bin/run.sh world out
   ./bin/decode_trace.sh out/trace.log reconstructed/
   echo "test" | ./bin/run.sh reconstructed/WORLD reconstructed/out
   cmp out/trace.log reconstructed/out/trace.log
   ```

4. **Maintain architecture hash**
   ```bash
   sha256sum ULP-v1.1-ARCHITECTURE.txt
   # Must be: 9872936e788b17f2b2114565b2af789350ea3e155e93ee0ce5cb1f656c5a57fd
   ```

### Adding Tests

When adding features, add tests to `validate.sh`:

```bash
# Add after existing tests
test_your_feature() {
    echo "Testing your feature..."
    # Your test code
    if [ $? -eq 0 ]; then
        echo "✓ Your feature works"
    else
        echo "✗ Your feature failed"
        exit 1
    fi
}
```

## Coding Standards

### Shell Scripts

**Style:**
```bash
#!/bin/sh
# Brief description
#
# Usage: script.sh <args>
# Preserves: Principle X

set -e  # Exit on error

# Use consistent indentation (2 or 4 spaces)
if [ -f "file" ]; then
    process_file
fi

# Quote variables
echo "$variable"

# Use portable constructs
# ✓ [ "$a" = "$b" ]
# ✗ [[ "$a" == "$b" ]]  # Bash-specific
```

**Portability:**
- Use `#!/bin/sh`, not `#!/bin/bash`
- Avoid bashisms (use `shellcheck`)
- Test on multiple shells (dash, bash, ash)

### AWK Scripts

**Style:**
```awk
#!/usr/bin/awk -f
# Brief description
# Preserves: Principle X

BEGIN {
    FS = "\t"  # Tab-separated fields
}

# Clear comments for complex logic
$1 == "STDOUT" {
    # Extract and process
    process($5)
}

END {
    # Cleanup
}
```

**Best practices:**
- Use `-F'\t'` for tab separation
- Validate field counts
- Handle edge cases
- Use meaningful variable names

### Documentation

**Code comments:**
```bash
# What this does (not how)
# Why it's necessary
# Which principle it preserves
```

**Commit messages:**
```
Brief summary (50 chars or less)

Detailed explanation:
- What changed
- Why it changed
- Which principle it preserves or relates to

Fixes #123
```

## Pull Request Process

### Before Submitting

- [ ] All tests pass (`./validate.sh`)
- [ ] Code follows style guidelines
- [ ] Documentation updated (if needed)
- [ ] Commit messages are clear
- [ ] Branch is up to date with main
- [ ] Changes preserve the Five Principles

### PR Description Template

```markdown
## Summary
Brief description of changes

## Motivation
Why this change is needed

## Changes
- Change 1
- Change 2

## Principle Preservation
How this PR preserves the Five Principles:
1. Trace Append-Only: ...
2. Non-Executable World: ...
3. Pure Projections: ...
4. Forward Effects: ...
5. Forward Information: ...

## Testing
- [ ] ./validate.sh passes
- [ ] Determinism verified
- [ ] Self-encoding works
- [ ] Platform tested: ...

## Breaking Changes
None / Requires v2.0 because ...
```

### Review Process

1. **Automated checks run** (if CI is set up)
2. **Maintainer review** (usually within 1 week)
3. **Discussion and iteration** (if needed)
4. **Approval and merge** (if all checks pass)

### What Reviewers Check

- Preserves Five Principles ✓
- Tests pass ✓
- Code quality ✓
- Documentation ✓
- No breaking changes (or appropriate version bump) ✓

## Breaking Changes

### If Your Contribution Violates a Principle

**Stop.** This requires v2.0+, not v1.x.

Process:
1. Open a discussion (not PR) explaining:
   - Which principle would be violated
   - Why the change is necessary
   - What the benefits are
   - What the costs are (backward compatibility loss)

2. Community discussion:
   - Alternatives explored
   - Trade-offs evaluated
   - Consensus sought

3. If approved:
   - New major version (v2.0+)
   - New architecture specification
   - New architecture hash
   - Migration guide
   - Clear documentation of incompatibility

**Important**: Breaking changes are discouraged. The Five Principles are sealed for good reasons.

## Types of Contributions

### Documentation

**Always welcome:**
- Fixing typos
- Clarifying explanations
- Adding examples
- Translating to other languages

**Process:**
- Small fixes: Direct PR
- Large changes: Issue first

### Bug Fixes

**Critical bugs** (breaking determinism, security):
- Report immediately
- Fast-track review
- May be merged quickly

**Non-critical bugs**:
- Normal process
- Include test case
- Explain root cause

### Features

**Small features** (new interrupt, projection optimization):
- Issue or PR directly
- Include tests
- Document usage

**Large features** (new tool, major refactor):
- Issue first
- Design discussion
- Phased implementation
- Extensive testing

### Testing

**Always valuable:**
- Platform-specific tests
- Edge case coverage
- Fuzz testing
- Performance benchmarks

## Community

### Communication Channels

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Design discussions, questions
- **Email**: brian@universal-life-protocol.com

### Getting Help

**Stuck?** Ask for help:
- Comment on your PR
- Open a discussion
- Send an email

We're happy to help new contributors!

### Recognition

Contributors are recognized in:
- CHANGELOG.md
- Git history
- Special mention for significant contributions

## License

By contributing, you agree that your contributions will be licensed under the Architectural Preservation License. See [LICENSE](LICENSE).

You must ensure:
- You have rights to submit the contribution
- Your contribution is original work or properly licensed
- You understand the Architectural Preservation requirements

## Questions?

- **General questions**: Open a GitHub Discussion
- **Bug reports**: Open a GitHub Issue
- **Security issues**: Email brian@universal-life-protocol.com (private)
- **License questions**: Email brian@universal-life-protocol.com

---

**Thank you for contributing to ULP v1.1!**

*"The trace is the machine. Let's build it together."*
