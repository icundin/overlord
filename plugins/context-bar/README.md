# context-bar

A band above the Claude Code prompt that draws the context window as a stacked bar, one color per
`/context` category, with the model, the effort level, and cards for the breakdown and the plan usage.

```
◆ context · Opus 5.5 · high │ breakdown · usage · settings     312k of 1M · +7.4k · $0.42 last turn · ≈ 40 turns to 80%  31%
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▒▒
⚠ Session cost $51.20, past your $50
```

## Requirements

- Claude Code with mods (hooks modules); built and tested on 2.1.296. Mods are an early-access surface that may
  change between releases.
- The band draws in the terminal and in the desktop app; other surfaces show nothing.

## Install

At the Claude Code prompt:

```
/plugin install context-bar --marketplace icundin/claude-code-toolkit
```

Answer `y` to add the marketplace, then pick a scope (user, for every session). The band shows from the next prompt
on.

Optional, to try it from a local clone of this repository before it is published:

```
/plugin install context-bar --marketplace ~/Code/claude-code-toolkit
```

## Update and uninstall

From a shell:

```bash
claude plugin marketplace update claude-code-toolkit
claude plugin update context-bar@claude-code-toolkit
```

```bash
claude plugin uninstall context-bar@claude-code-toolkit
```

## Using it

- **Hover a segment** of the bar to see its tokens and share of the window.
- **Model and effort** in the header open a menu that runs `/model` or `/effort` for you, as if typed: Claude Code
  applies them as it does those commands (`/effort` saves the level as your default). While subagents work, the
  header counts them (`2 agents`).
- **The totals** show what the last turn added and cost (`+9.4k · $0.42 last turn`) and, at that pace, how many
  turns are left before the warning threshold or compaction (`≈ 40 turns to 80%`). On a narrow terminal they drop
  that detail first.
- **breakdown** lists every category, the MCP tools by server, the memory files and the skills by source, and links
  to `/context` for the full detail.
- **usage** shows the plan limits, the session's cost and time, and the tokens; with buttons to
  compact the session or start a new one (both ask to confirm first).
- **settings** opens the settings card.
- **`/context-bar`** hides or shows the band; it fills in again when shown.
- Every card closes with `[x]` or by clicking its header label again. Clicking in the band gives it the keyboard;
  Esc, or a click on the prompt, returns it.

## Settings

Changed from the band's **settings** card; they apply right away and carry over to new sessions. Click a value to
move it on, or type into a field and press Enter, which confirms what it saved. **reset to defaults**, at the bottom of
the card, puts every setting back.

A crossed warning shows as a yellow line under the bar for as long as it applies, worked out from the current
figures each time the band draws; in the context warning, `/compact` itself is clickable.

Compacting, starting a new session and resetting the settings ask first: the first click turns the button red,
the second runs it, and the question lapses after five seconds.

| Setting | Default | Choices |
|---|---|---|
| Show the bar when a session starts | true | true, false |
| Warnings: when the context passes (%) | 80 | any whole number 0–100, 0 is off; suggests `/compact` |
| Warnings: when a plan limit passes (%) | 90 | any whole number 0–100, 0 is off |
| Warnings: when the session cost passes ($) | 50 | any amount, cents optional, 0 is off |
| Display mode | auto | auto (follows Claude Code's theme), dark, light |
| Category theme | default | default (the desktop app's hues, in Claude Code's own agent colors), monokai, dracula, nord, catppuccin, github, gruvbox, tokyo night, custom: a hex color per category, `#RRGGBB` or `#RGB`; empty goes back to the default |

## Limits

- Token, time and cache figures are counted by the mod from when it loads, since Claude Code does not
  hand mods the session's earlier requests. The cost is the whole session's.
- Per-model weekly limits and the plan's name are not available to mods.
- With Claude Code's theme on `auto` the bar is shaded as dark, since a mod cannot see the terminal's colors;
  set **Display mode** to `light` in the settings card if your terminal is light.

## Developing

The mod's tests and its manifest check, from the repository's root:

```bash
claude plugin test plugins/context-bar
claude plugin validate plugins/context-bar
```

`claude --plugin-dir plugins/context-bar` starts a session with this folder loaded, without installing it.
