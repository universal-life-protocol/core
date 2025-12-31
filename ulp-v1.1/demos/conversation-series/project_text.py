#!/usr/bin/env python3
"""
π_text: Pure projection from ULP trace to readable text
ULP v1.1 - Demonstrates projection purity

This is a PURE FUNCTION:
  - Input: Trace file path
  - Output: Human-readable text (to stdout)
  - No side effects: No file writes, no network, no state mutation
  - Deterministic: Same trace → same output

Usage:
    python3 project_text.py <trace_file>

Example:
    python3 project_text.py 01-five-invariants.trace
    python3 project_text.py 02-trace-as-machine.trace > output.txt
"""

import sys


def unescape(text):
    """
    Pure function: Unescape trace-encoded text

    ULP traces escape special characters in STDOUT records:
      \\n → newline
      \\t → tab
      \\r → carriage return
      \\\\ → backslash
    """
    text = text.replace('\\n', '\n')
    text = text.replace('\\t', '\t')
    text = text.replace('\\r', '\r')
    text = text.replace('\\\\', '\\')
    return text


def project_text(trace_path):
    """
    Pure projection: π_text(Trace) → Text

    Extracts STDOUT records from trace and unescapes them.
    This is a lossy projection - loses trace structure, keeps content.

    Args:
        trace_path: Path to ULP trace file

    Returns:
        None (outputs to stdout, which is the "return value" in Unix)
    """
    with open(trace_path, 'r', encoding='utf-8') as f:
        for line in f:
            # Skip metadata lines
            if line.startswith('#METADATA'):
                continue

            # Parse tab-separated fields
            fields = line.strip().split('\t')

            # Extract STDOUT records (conversation text)
            if fields[0] == 'STDOUT' and len(fields) >= 5:
                # Field structure: STDOUT \t n \t <line_num> \t text \t <content>
                text = fields[4]

                # Unescape (pure transformation)
                text = unescape(text)

                # Output to stdout (this is the projection result)
                print(text)


def main():
    """Main entry point"""
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <trace_file>", file=sys.stderr)
        print(f"\nExample: {sys.argv[0]} 01-five-invariants.trace", file=sys.stderr)
        sys.exit(1)

    trace_path = sys.argv[1]

    try:
        # Apply pure projection
        project_text(trace_path)
    except FileNotFoundError:
        print(f"Error: Trace file not found: {trace_path}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
