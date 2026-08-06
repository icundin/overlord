# claude-code-toolkit — repository guide

## What this repository is

Source of truth for a personal `~/.claude`: Claude Code skills today, with
room for agents and other extensions — each type in a top-level
folder mirroring its place under `~/.claude`. This is **source, not the
installation**: the running
copies live in `~/.claude/skills/` on the user's machine — editing here
changes nothing until the user copies files over.

## For AI agents developing artifacts here

- **Skills are law-shaped.** Rules exist because real runs failed without
  them. Never soften or "simplify" a rule without understanding the failure
  it prevents; prefer removing it outright, with reasoning, over vague
  rewording.
- **Keep skills lean.** Long skills cause step-skipping in unattended runs —
  every sentence must pay rent. Examples are load-bearing (they carry naming
  and format conventions); never cut them as decoration.
- **Each skill is self-contained**: full user documentation in its
  `README.md`; the `SKILL.md` itself is the authoritative statement of the
  skill's rules and invariants — don't create parallel guides that restate
  it. The root files never grow per-skill detail.
- **Update the root `CHANGELOG.md`** whenever a skill is added or changed —
  one changelog for the collection, each entry naming the skill and saying
  what changed and, more importantly, why.
