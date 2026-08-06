#!/usr/bin/env python3
"""Extract user turns from Claude Code session transcripts (.jsonl).

SECURITY POSTURE (for reviewers): read-only by construction. Stdlib only
(json/sys/os), no third-party imports, no network, no subprocess, no eval,
never writes or deletes anything. Input: file paths as arguments. Output:
plain text to stdout. ~50 lines — audit it in one sitting.

Usage: python3 extract.py [--max-chars N] file1.jsonl [file2.jsonl ...]
Prints a '### <project>/<file> ###' header per file, then one line per user
turn: [timestamp] text. Skips tool results and system-reminder noise.
Never modifies anything. Exists so dream runs use one stable, pre-approvable
command instead of improvised shell that trips permission heuristics.
"""
import json, sys, os

def turns(path):
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                d = json.loads(line)
            except ValueError:
                continue
            if d.get("type") != "user":
                continue
            c = (d.get("message") or {}).get("content")
            if isinstance(c, list):
                c = " ".join(x.get("text", "") for x in c if isinstance(x, dict) and x.get("type") == "text")
            if not isinstance(c, str):
                continue
            c = c.strip()
            if not c or "<system-reminder>" in c or "tool_use_id" in c:
                continue
            yield d.get("timestamp", "?"), c

def main():
    args = sys.argv[1:]
    max_chars = None
    if args and args[0] == "--max-chars":
        max_chars = int(args[1]); args = args[2:]
    if not args:
        print("usage: extract.py [--max-chars N] file.jsonl ...", file=sys.stderr)
        return 1
    for path in args:
        name = os.path.join(os.path.basename(os.path.dirname(path)), os.path.basename(path))
        print(f"### {name} ###")
        out, total = [], 0
        for ts, text in turns(path):
            row = f"[{ts}] {text}"
            if max_chars is not None and total + len(row) > max_chars:
                out.append(f"[... truncated at {max_chars} chars ...]")
                break
            out.append(row); total += len(row)
        print("\n".join(out) if out else "(no user turns)")
        print()
    return 0

if __name__ == "__main__":
    sys.exit(main())
