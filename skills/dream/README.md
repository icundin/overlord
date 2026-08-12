# /dream — nightly memory consolidation

Modeled on Anthropic's dreaming feature, inverted on one axis — **if unsure,
propose, don't act**: nothing is ever written to memory without your explicit
approval.

Every night, the skill reads your recent session transcripts, compares them
against your long-term memory, and produces a report of proposed memory
changes — each one a single fact, backed by a verbatim quote of your own
words, with the model's confidence and category attached as display-only
opinion. You review, it remembers.

### How it works

- **Census-complete**: every candidate found gets an explicit verdict
  (`propose` or `drop: <reason>` from a closed vocabulary) printed at the end
  of every report. Nothing is silently omitted — a viable candidate left out
  is defined as a failure.
- **Three verbs**: Approve (becomes memory), Ignore (final — recorded in
  `ignored.md`, never asked again), Snooze (carried up to 3 runs, then
  expires). Undecided proposals carry forward with a visible night counter.
- **One fact per file**: memories live as kebab-case markdown files in
  `~/.claude/memory/facts/`, indexed in `MEMORY.md`, each with its evidence
  source and absolute dates.
- **HTML review report**: proposals render as an interactive page — keyboard
  triage (↑↓ / A / I / S / U), live progress, and a command builder that
  unlocks only when every card is decided. Decisions become one paste:
  `/dream apply 1,3 ignore 2`. After applying, both the report and its dated
  archive re-render as a read-only record — your verdicts beside the model's
  guesses.
- **Dated archives**: every night's questions and your answers are kept in
  `~/.claude/memory/archive/`, a browsable diary of what the machine learned
  about you and what you let it keep.
- **Living memory page**: every run ends by regenerating
  `~/.claude/memory/memory.html` — one standalone page indexing what Claude
  currently knows: active facts grouped by category, the ignored list, and a
  night-by-night chronology rebuilt from the dated archives, including how
  well the model's confidence predicted your verdicts. Built by a
  deterministic script from what's on disk — never written by the model by
  hand.
- **Two modes**: daily (24h window) and deep dream (7-day window, wider
  extraction budget) — the mode is chosen by the invoking prompt, never by
  the skill's own calendar. Scheduling belongs to your routines.
- **Safe fixes only**: the single autonomous power is index repair and typo
  fixes in text the model itself wrote. Everything else waits for you. In
  the report these repairs surface as an anomaly: a warning-orange block
  that exists only on nights something was actually repaired — quiet nights
  show nothing but the zero in the stats row, which remains the nightly
  attestation that memory wasn't touched.

### Install

1. Copy this folder to `~/.claude/skills/dream/`.
2. Create the memory store and wire it into every session — in
   `~/.claude/CLAUDE.md`:

   ```markdown
   # Memory
   @~/.claude/memory/MEMORY.md
   The memory store (~/.claude/memory/) is READ-ONLY for normal sessions: never
   create, edit, or delete anything in it on your own initiative. Memory changes
   happen only through the /dream skill's proposal flow, or when I explicitly ask
   ("add this to memory"). If something in this session seems worth remembering,
   say so out loud — the nightly dream will find it and propose it with evidence.
   ```

   Seed `~/.claude/memory/MEMORY.md` with:

   ```markdown
   # Memory index
   Fact files live in `facts/`; each entry below is a path relative to this file.
   One line per memory file: `path — one-line summary`.
   Keep it an index, not a dump: under ~150 characters per line.
   ```

3. Schedule it. Two Local routines in the Claude Desktop app work well
   (folder `~/.claude`, mode Auto):

   | Routine | Schedule | Instructions |
   |---|---|---|
   | Daily dream | cron `5 8 * * 2-5` | Run the dream skill in NON-INTERACTIVE mode: read `~/.claude/skills/dream/SKILL.md` and follow it fully — HTML report, dated archives, opening the finished report in the browser. Apply nothing to memory except the safe fixes the skill defines. |
   | Weekly deep dream | Weekly · Monday 08:05 | Same, but: run it as a DEEP DREAM with the skill's deep-dream defaults. |

   Use **Auto** mode: an unattended run needs to write its report, archives,
   and (once you approve) memory files, and nobody is there to click through
   the prompts. Everything it writes stays inside `~/.claude/memory`.

   No scheduler? Just type `/dream` in any session and approve as it goes.

### Usage

```
/dream                          review last 24h, propose changes
/dream apply 1,3 ignore 2       apply / permanently dismiss by id
/dream apply all
```

Deep dream, any time: *"Run the dream skill as a DEEP DREAM (7-day window)."*
The prompt may override the window ("deep dream, 14 days").

### Security

Both executables are stdlib-only, no network, no subprocess — auditable in
one sitting. `scripts/extract.py` is read-only by construction (~50 lines);
it exists so transcript extraction is one fixed, pre-approvable command
instead of improvised shell. `scripts/build_memory_page.py` writes exactly
one file, `~/.claude/memory/memory.html`, rendered deterministically from
what is already on disk — no model judgment involved.

### Portability

Developed and run on macOS; Linux equivalent. Windows: `~/.claude` resolves
to `%USERPROFILE%\.claude`, and the skill documents faithful PowerShell
equivalents for its POSIX commands — specified, not yet tested. Reports
welcome.

### Prior art

Modeled on Anthropic's dreaming feature for Claude Code. The internal
consolidation prompt documented at
[Piebald-AI/claude-code-system-prompts](https://github.com/Piebald-AI/claude-code-system-prompts/blob/main/system-prompts/agent-prompt-dream-memory-consolidation.md)
served as reference for the memory-hygiene mechanics (index discipline,
absolute dates, consolidation passes). This implementation inverts its
autonomy model: the official prompt consolidates autonomously; here, every
memory change requires explicit user approval.
