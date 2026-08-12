#!/usr/bin/env python3
"""Build ~/.claude/memory/memory.html from what is already on disk.

Deterministic: reads facts/*.md, ignored.md and archive/dream-*.html,
assembles one JSON blob and fills assets/memory-template.html.
No model judgment involved; safe to re-run anytime.
"""
import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

TEMPLATE = Path(__file__).resolve().parent.parent / "assets" / "memory-template.html"
MARKER = "__DATA_JSON__"


def parse_frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---\n?", text, re.S)
    if not m:
        return {}, text
    fm, body = m.group(1), text[m.end():]
    fields = {}
    for key in ("name", "description"):
        km = re.search(rf"^{key}:\s*(.+)$", fm, re.M)
        if km:
            fields[key] = km.group(1).strip()
    tm = re.search(r"^\s+type:\s*(\w+)", fm, re.M)
    if tm:
        fields["type"] = tm.group(1)
    return fields, body


def parse_facts(facts_dir):
    facts = []
    for f in sorted(facts_dir.glob("*.md")):
        fields, body = parse_frontmatter(f.read_text(encoding="utf-8"))
        sm = re.search(r"^Source:\s*(.+)$", body, re.M)
        dm = re.search(r"(\d{4}-\d{2}-\d{2})", sm.group(1)) if sm else None
        facts.append({
            "file": f.name,
            "name": fields.get("name", f.stem),
            "summary": fields.get("description", ""),
            "type": fields.get("type", ""),
            "source": sm.group(1).strip() if sm else "",
            "source_date": dm.group(1) if dm else None,
        })
    return facts


def parse_ignored(path):
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^-\s*(\d{4}-\d{2}-\d{2}):\s*(\S+)\s+—\s+(.*)$", line)
        if m:
            rows.append({"date": m.group(1), "slug": m.group(2), "summary": m.group(3).strip()})
    return rows


def parse_archives(archive_dir, notes):
    nights = []
    for f in sorted(archive_dir.glob("dream-*.html")):
        dm = re.search(r"dream-(\d{4}-\d{2}-\d{2})", f.name)
        text = f.read_text(encoding="utf-8")
        mm = re.search(r"^const META = (.*);\s*$", text, re.M)
        pm = re.search(r"^const PROPOSALS = (.*);\s*$", text, re.M)
        if not (dm and mm and pm):
            notes.append(f"{f.name}: no embedded JSON found — skipped")
            continue
        try:
            meta, proposals = json.loads(mm.group(1)), json.loads(pm.group(1))
        except json.JSONDecodeError as e:
            notes.append(f"{f.name}: unreadable JSON ({e.msg}) — skipped")
            continue
        nights.append({"date": dm.group(1), "meta": meta, "proposals": proposals})
    return nights


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--memory-dir", type=Path,
                    default=Path.home() / ".claude" / "memory")
    args = ap.parse_args()

    mem = args.memory_dir
    if not mem.is_dir():
        sys.exit(f"memory dir not found: {mem}")
    if not TEMPLATE.exists():
        sys.exit(f"template not found: {TEMPLATE}")

    notes = []
    facts = parse_facts(mem / "facts") if (mem / "facts").is_dir() else []
    ignored = parse_ignored(mem / "ignored.md")
    nights = parse_archives(mem / "archive", notes) if (mem / "archive").is_dir() else []

    # file basename -> category / applied-night date, later nights win
    category, applied_on = {}, {}
    for night in nights:
        for p in night["proposals"]:
            base = Path(p.get("file", "")).name
            if p.get("category"):
                category[base] = p["category"]
            if p.get("decision") == "applied":
                applied_on[base] = night["date"]

    for fact in facts:
        fact["category"] = category.get(fact["file"], "other")
        fact["applied"] = applied_on.get(fact["file"]) or fact.pop("source_date")
        fact.pop("source_date", None)
    for row in ignored:
        row["category"] = category.get(row["slug"] + ".md", "other")

    data = {
        "generated_at": datetime.now().astimezone().strftime("%A %-d %B %Y · %H:%M"),
        "facts": facts,
        "ignored": ignored,
        "nights": sorted(nights, key=lambda n: n["date"], reverse=True),
        "notes": notes,
    }

    html = TEMPLATE.read_text(encoding="utf-8")
    if MARKER not in html:
        sys.exit(f"marker {MARKER} missing in template")
    out = mem / "memory.html"
    out.write_text(html.replace(MARKER, json.dumps(data, ensure_ascii=False)),
                   encoding="utf-8")
    print(f"memory.html: {len(facts)} facts, {len(ignored)} ignored, "
          f"{len(nights)} nights -> {out}")
    for n in notes:
        print(f"note: {n}", file=sys.stderr)


if __name__ == "__main__":
    main()
