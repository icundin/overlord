### claude-code-toolkit Changelog

One changelog for the collection; every entry names the artifact it concerns.

# 1.3.0 — 2026-08-12

- Dream: New verb — `/dream forget <slug>` revokes an applied memory on the user's explicit command: deletes the fact file, removes its index line, and records the revocation in `ignored.md` (final, never re-proposed). Until now nothing could remove a fact that time proved a bad call; the approval gate exists to filter the model's judgment, not the user's, so a user-initiated revocation needs no proposal loop.
- Dream: memory.html — each fact card gets a `forget` button on its header line that copies the ready-made command (native title as the only pre-click hint; a toast confirms the copy and reminds that the page only reflects it once the command runs and the page regenerates). The page remains review-only and cannot touch memory.
- Dream: Ignore scope clarified in SKILL.md — the veto binds that exact fact, not its topic: a materially different claim on the same theme is a fresh candidate, proposed citing the ignored neighbor; prevents silent over-generalization of old vetoes.
- Dream: The vanished-memory anomaly rule now excepts slugs recorded in `ignored.md` — missing from disk plus present there means a deliberate forget, not an anomaly to re-propose.

# 1.2.0 — 2026-08-12

- Dream: The report's "Applied automatically" block now appears only when the run actually auto-applied a safe fix, styled as a warning (orange, ⚠ per item, matching stat colors) — unattended repairs are an anomaly worth attention, not a nightly card saying "nothing happened". The zero in the stats row remains as the quiet-night attestation, so no information is lost. Archived reports are never rewritten: each stays a snapshot of the skill's behavior the night it ran.

# 1.1.0 — 2026-08-12

- Dream: Memory page — every run now ends by regenerating `~/.claude/memory/memory.html` with the new `scripts/build_memory_page.py` + `assets/memory-template.html`: a standalone index of active facts grouped by category, the ignored list, and a night-by-night chronology rebuilt from the dated archives, with a confidence-calibration line. The archives held the history but nothing showed the current state of memory in one view.
- Dream: The page is built by a deterministic, stdlib-only script from what's on disk — the model is forbidden from hand-building or editing `memory.html`, so the page can never disagree with the memory store.
- Dream: Completion checklist (non-interactive) extended — a fresh `memory.html` is now a verified output of every run.
- Dream: Ignore format in SKILL.md now spells out the real `ignored.md` line shape (`- <date>: <file-slug> — <summary>`), matching what the memory-page script parses — the older wording omitted the slug, and slug-less lines would vanish from the page's ignored list.

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
