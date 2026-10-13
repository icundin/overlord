# context-bar

A band above the Claude Code prompt that draws the context window as a stacked bar, one color per
`/context` category, with the model, the effort level, and cards for the breakdown and the plan usage.

```
◆ context · Opus 5.5 · high │ breakdown · usage · settings          312k of 1M · +7.4k last turn  31%
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▒▒
```

## Install

```
/plugin install context-bar --marketplace icundin/claude-code-toolkit
```

Answer `y` to add the marketplace, then pick a scope. The bar shows from the next prompt on.

## Using it

- **Hover a segment** of the bar to see its tokens and share of the window.
- **Model and effort** in the header open a menu that runs `/model` or `/effort` for you; while subagents work,
  the header counts them (`2 agents`).
- **The totals** show what the last turn added and cost (`+9.4k · $0.42 last turn`) and, at that pace, how many
  turns are left before the warning threshold or compaction (`≈ 40 turns to 80%`).
- **breakdown** lists every category, the MCP tools by server, the memory files and the skills by source, and links
  to `/context` for the full detail.
- **usage** shows the plan limits, the session's cost and time, and the tokens; with buttons to
  compact the session or start a new one (asks to confirm first).
- **settings** opens the settings card; `/context-bar` hides or shows the band.

## Settings

Changed from the band's **settings** card; they apply right away and carry over to new sessions. A field keeps
the keyboard after Enter, as anything clicked in the band does: Esc, or a click on the prompt, returns to it.
**reset to defaults**, at the bottom of the card, puts every setting back after a confirming second click.

A crossed warning shows as a yellow line under the bar for as long as it applies, worked out from the current
figures each time the band draws; the context warning comes with a **compact** button that runs `/compact`.

| Setting | Default | Choices |
|---|---|---|
| Show the bar when a session starts | on | on, off |
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
