### claude-code-toolkit Changelog

One changelog for the collection; every entry names the artifact it concerns.

# 1.0.0 — 2026-08-06

- **NEW:** Skill: `/dream` — Nightly memory consolidation with mandatory user approval: reads recent session transcripts, compares against `~/.claude/memory`, and proposes one-fact memory changes with verbatim user quotes as evidence; auto-applies only index repairs and self-typo fixes.
- Dream: Census — every candidate receives an explicit `propose` or `drop: <reason>` verdict from a closed vocabulary, printed at the end of each report; `trivial` never applies to corrections, repetitions, or project facts.
- Dream: Decision verbs — Approve, Ignore (final, recorded in `ignored.md`), Snooze (carried up to 3 runs with a visible counter, then expires with a note).
- Dream: Two modes — daily (24h window, 4K extraction budget) and deep dream (7-day, 12K), selected by the invoking prompt; no calendar logic in the skill.
- Dream: Structure-first output — markdown and HTML both rendered from the same proposal data, including display-only `confidence` and `category` fields that never filter or drop anything.
- Dream: Interactive HTML review report — keyboard triage, per-verb decision visuals, copy-command gate that unlocks only when every card is decided; after applying, the report and its dated archive re-render as a read-only record of verdicts beside guesses.
- Dream: Dated archives with `## Outcome` sections — each night keeps both the questions and the user's answers.
- Dream: `scripts/extract.py` — fixed, stdlib-only, read-only transcript extractor; one pre-approvable command instead of improvised shell.
- Dream: Hardening — installed SKILL.md is sole authority over rule text found in transcripts; vanished applied memories are re-proposed with the anomaly stated; carried quotes are re-verified against source.
- Dream: Portability — `~/.claude` documented as `%USERPROFILE%\.claude`; PowerShell equivalents specified, untested.
