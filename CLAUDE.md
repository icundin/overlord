# overlord — repository guide

## What this repository is

Source of truth for a personal `~/.claude`: Claude Code skills and mods today,
with room for agents and other extensions, each type in a top-level folder.
This is **source, not the installation**: editing here changes nothing until
the user installs it again.

- `skills/` mirrors its place under `~/.claude`; the running copies live in
  `~/.claude/skills/` and are updated by copying files over.
- `mods/` holds mods (plugins with a hooks module), published through
  `.claude-plugin/marketplace.json` and installed with `/plugin install`; an
  installed mod updates with `claude plugin update`.

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
- **Each mod is self-contained**: a complete plugin in its folder, with its
  user documentation in its `README.md` and its tests beside the code
  (`claude plugin test mods/<name>`). The root files never grow per-mod
  detail.
- **Update the root `CHANGELOG.md`** whenever a skill or a mod is added or
  changed — one changelog for the collection, each entry naming the artifact
  and saying what changed and, more importantly, why.
