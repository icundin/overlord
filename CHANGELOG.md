### claude-code-toolkit Changelog

One changelog for the collection; every entry names the artifact it concerns.

# 1.8.2 — 2026-10-14

- Context bar: A turn typed while `/compact` runs measures its growth and cost from the compacted context. Claude Code counts the compacted context a moment after `/compact` returns, and the turn started from the figures before it, so the header read `−133k · $0.50 last turn` for a turn that added 5k and cost $0.20.
- Context bar: The tokens' `counted for the last` runs from the start of the first turn the mod counted. It ran from the end of that turn's first request, so right after the first message it read `0s` beside the request's own API time.
- Context bar: The cards' tips wrap into even lines. The text wraps at the card's width, which follows the terminal's, so no wording avoids a stray word at every width: at 120 columns the usage card's tip left `tasks.` alone on its last line.

# 1.8.1 — 2026-10-14

- Context bar: The cost by agent's summary says only what its rows say. Loaded into a running session that had already spent (an update applied with `/reload-plugins`), the mod has counted no request yet, so the rows hold only the earlier cost, while the summary read `main 0%`; it now reads `earlier 100%` until the next message.

# 1.8.0 — 2026-10-14

- Context bar: The usage card splits the session's cost by agent: a row per agent with a bar of its share, in line with the plan limits' bars, and its cost, tokens and models: main first, then each subagent by its task and Claude Code's own requests by cost, and what was spent before the mod began counting last. A task run more than once on the same models shares a row with a count, and past four rows the cheapest fold into one that a click opens, so the card stays short however many subagents a session runs. The total said what the session cost, not which agent spent it. Claude Code hands mods only that total, so each agent's share is measured as the total's growth when its requests return, with no price table to keep up to date, and the shares add up to the total the card shows.
- Context bar: An amount under a cent reads `<$0.01` wherever the band shows money, not `$0.00`. A subagent on Haiku that used 31k tokens read as free.

# 1.7.0 — 2026-10-14

- Context bar: The header shows the session's cost so far next to the last turn's (`$0.42 last turn · $1.16 total`). The total was only in the usage card, a click away, while the header showed one turn's share of it; on a narrow terminal the total outlasts the last turn's figures, as the running figure says more.

# 1.6.0 — 2026-10-14

- Context bar: The usage card says how old the plan limits are (`38%, 12% · updated 14 min ago`). The limits belong to the account, but a session learns new figures only when one of its own requests comes back, main thread or subagent, so an idle session showed figures other sessions had long moved past as if they were current. The card redraws each minute while open, since an idle band draws nothing new by itself; its reset countdowns move on with it.
- Context bar: The cards' section summaries separate their parts with ` · `, as the header does, and join a list with `, ` (`50k · 25%`, `1.2M · Opus 5.5, Haiku 5.5 · counted for the last 5m`). The summaries used two spaces in some places and ` · ` in others, the limits for a list and the tokens between different things, so the age added to the limits had no separator of its own.

# 1.5.4 — 2026-10-14

- Context bar: Shows the compacted fill after a `/compact`, typed or clicked, on every install. The 1.5.2 refresh ran as the compaction ended, before Claude Code counted the compacted context, so it redrew the old fill; the bar now re-reads the figures until they drop, one read at a time, for five seconds at most. It hooks `/compact` itself instead of `session.compact`, which doesn't run in a plugin installed where an organization manages Claude Code.
- Context bar: Every button in the band that runs a command (compact, new session, `/model`, `/effort`, `/context`) starts it once the click returns. The click waited for the command to finish: during a turn Claude Code holds it until the session is idle, and a compaction alone takes longer than Claude Code's 10-second budget for a click, so the click ended with `ui.press hook skipped: ran past its 10s budget`.

# 1.5.3 — 2026-10-14

- Context bar: Draws again in the session a `/clear` starts, the band's **new session** button included, with the saved settings. A `/clear` wipes the mod's session state and raises no `session.start`, where the mod read its settings and figures, so the bar was gone and the settings fell back to their defaults.

# 1.5.2 — 2026-10-13

- Context bar: Refreshes as soon as a compaction ends, typed, clicked or automatic. It refreshed only when a turn completed, and `/compact` is no turn, so the bar kept the pre-compaction fill until the next message.

# 1.5.1 — 2026-10-13

- Context bar: Draws on the terminal only; the desktop app keeps its own band. The desktop lays the band out in a proportional font, where the bar's cells and shades read as dot patterns, rows wrap and the hover cards land on the header, so a faithful version would need its own layout for every card.

# 1.5.0 — 2026-10-13

- **NEW:** Mod: `context-bar` — the context window drawn as a stacked bar above the prompt, one color per `/context` category, with the model and effort (each a menu that runs `/model` or `/effort`), a breakdown card, a usage card (plan limits, cost, tokens, compact and new-session buttons) and a settings card. `/context` shows the window only when asked; the bar keeps it in view while working, so compaction and limits stop arriving as surprises.
- Context bar: Warnings at a context fill, a plan-limit use and a session cost the person sets (80%, 90% and $50 by default), shown as a line under the bar for as long as they apply, the context warning's `/compact` itself clickable. Compacting, a new session and resetting the settings ask first, and an unanswered question lapses after five seconds: each loses something (the conversation's detail, the session, the settings) too easily to a stray click. The line is worked out from the current figures each time the band draws, so it never waits for an event to show a crossing or a changed threshold.
- Context bar: The header shows what the last turn added and cost, how many turns are left at the recent pace (the last few turns) before the warning threshold or compaction, and how many subagents are running; the breakdown lists MCP tools by server, memory files and skills by source. The figures said how much was used, not how fast, nor what it was spent on.
- Context bar: Settings live in the mod's own store and are edited in the band, not in `/config`, where a plugin loaded from a folder did not list them.
- Repository: `.claude-plugin/marketplace.json` makes the repository a marketplace for the mods in `mods/`, so a mod installs with `/plugin install <name> --marketplace icundin/claude-code-toolkit`; the root README points to each artifact's own install steps instead of repeating them.

# 1.4.0 — 2026-09-08

- Dream: A night with no proposals no longer asks to be reviewed — `memory.html` marks it `quiet night` and `dream-report.html` hides the apply/ignore bar and its shortcuts. A routine that woke up and found nothing has nothing to decide, but both pages read as if a decision were still owed.
- Dream: Only the newest night can be `awaiting review`; an older undecided night is marked `missed`. Apply reads the most recent proposal list (`SKILL.md`), and anything left undecided is carried forward into the next report or expires — so an old night's badge was promising an action that no longer exists.
- Dream: `SKILL.md` states both rules as invariants of the two pages, so the templates and the skill can't drift apart.
- Dream: A deep dream is now identified by data instead of a label — `META` records `window_days`, the chronology derives the `deep dream` badge from it (anything wider than a day), and the expanded card shows the window as its own field. The old `title` field had to be remembered by hand and three of four deep dreams lost it; the window can't be forgotten because the run needs it to call the extractor. The badge also drops `weekly`: scheduling belongs to the routine, not to the report, and the skill's window is whatever the prompt asked for.
- Dream: The night card's header is a grid, not a wrapping row — Sessions read, Dreamed at, Window and Resolved sit in fixed columns that line up across cards (two columns under 600px), and projects always take a row of their own. Layout that fell out of content width made two cards with identical fields look unrelated.
- Dream: `memory.html` normalizes what past runs wrote differently — `outcome_at`'s five historical shapes (`5 August 2026 15:04`, `13 august 2026 08:20`, `10 August 2026, 08:20`, …) collapse to `YYYY-MM-DD HH:MM`. The empty case stops being free text: `projects` carries only the list, and the page writes one fixed note, `no work sessions in the window`. Each night used to word this however it felt, and nights disagreed on whether the skill's own dream runs count — `SKILL.md` now rules that they are never work: never counted in `sessions`, never listed in `projects`, so a night the user didn't work reads `0` whatever the skill left behind. `SKILL.md` fixes these shapes for future runs; the script normalizes the ones already archived, since the page is derived from the archives and never edits them.
- Dream: The page footer's date drops `%-d`, which MSVC rejects: the script raised before writing anything on Windows, where part of the team works. The day now carries a leading zero.
- Dream: `build_memory_page.py` recovers `window_days` for archives written before the field existed, reading the window each report already states in prose (`**Window:** 24 hours`, `last 7 days`) — all sixteen resolve, and the three deep dreams that had lost their label get it back. Archives stay untouched: the page is derived from them, never the other way round; a window that can't be read is reported as a note rather than guessed.

# 1.3.0 — 2026-08-12

- Dream: New verb — `/dream forget <slug>` revokes an applied memory on the user's explicit command: deletes the fact file, removes its index line, and records the revocation in `ignored.md` (final, never re-proposed). Until now nothing could remove a fact that time proved a bad call; the approval gate exists to filter the model's judgment, not the user's, so a user-initiated revocation needs no proposal loop.
- Dream: `memory.html` — each fact card gets a `forget` button on its header line that copies the ready-made command (native title as the only pre-click hint; a toast confirms the copy and reminds that the page only reflects it once the command runs and the page regenerates). The page remains review-only and cannot touch memory.
- Dream: Ignore scope clarified in `SKILL.md` — the veto binds that exact fact, not its topic: a materially different claim on the same theme is a fresh candidate, proposed citing the ignored neighbor; prevents silent over-generalization of old vetoes.
- Dream: The vanished-memory anomaly rule now excepts slugs recorded in `ignored.md` — missing from disk plus present there means a deliberate forget, not an anomaly to re-propose.

# 1.2.0 — 2026-08-12

- Dream: The report's "Applied automatically" block now appears only when the run actually auto-applied a safe fix, styled as a warning (orange, ⚠ per item, matching stat colors) — unattended repairs are an anomaly worth attention, not a nightly card saying "nothing happened". The zero in the stats row remains as the quiet-night attestation, so no information is lost. Archived reports are never rewritten: each stays a snapshot of the skill's behavior the night it ran.

# 1.1.0 — 2026-08-12

- Dream: Memory page — every run now ends by regenerating `~/.claude/memory/memory.html` with the new `scripts/build_memory_page.py` + `assets/memory-template.html`: a standalone index of active facts grouped by category, the ignored list, and a night-by-night chronology rebuilt from the dated archives, with a confidence-calibration line. The archives held the history but nothing showed the current state of memory in one view.
- Dream: The page is built by a deterministic, stdlib-only script from what's on disk — the model is forbidden from hand-building or editing `memory.html`, so the page can never disagree with the memory store.
- Dream: Completion checklist (non-interactive) extended — a fresh `memory.html` is now a verified output of every run.
- Dream: Ignore format in `SKILL.md` now spells out the real `ignored.md` line shape (`- <date>: <file-slug> — <summary>`), matching what the memory-page script parses — the older wording omitted the slug, and slug-less lines would vanish from the page's ignored list.

# 1.0.0 — 2026-08-06

- **NEW:** Skill: `/dream` — Nightly memory consolidation with mandatory user approval: reads recent session transcripts, compares against `~/.claude/memory`, and proposes one-fact memory changes with verbatim user quotes as evidence; auto-applies only index repairs and self-typo fixes.
- Dream: Census — every candidate receives an explicit `propose` or `drop: <reason>` verdict from a closed vocabulary, printed at the end of each report; `trivial` never applies to corrections, repetitions, or project facts.
- Dream: Decision verbs — Approve, Ignore (final, recorded in `ignored.md`), Snooze (carried up to 3 runs with a visible counter, then expires with a note).
- Dream: Two modes — daily (24h window, 4K extraction budget) and deep dream (7-day, 12K), selected by the invoking prompt; no calendar logic in the skill.
- Dream: Structure-first output — markdown and HTML both rendered from the same proposal data, including display-only `confidence` and `category` fields that never filter or drop anything.
- Dream: Interactive HTML review report — keyboard triage, per-verb decision visuals, copy-command gate that unlocks only when every card is decided; after applying, the report and its dated archive re-render as a read-only record of verdicts beside guesses.
- Dream: Dated archives with `## Outcome` sections — each night keeps both the questions and the user's answers.
- Dream: `scripts/extract.py` — fixed, stdlib-only, read-only transcript extractor; one pre-approvable command instead of improvised shell.
- Dream: Hardening — installed `SKILL.md` is sole authority over rule text found in transcripts; vanished applied memories are re-proposed with the anomaly stated; carried quotes are re-verified against source.
- Dream: Portability — `~/.claude` documented as `%USERPROFILE%\.claude`; PowerShell equivalents specified, untested.
