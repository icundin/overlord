# claude-code-toolkit

> If unsure, propose — don't act.

A personal toolkit for [Claude Code](https://docs.claude.com/en/docs/claude-code) —
skills and plugins today; agents and other extensions as they earn their place.
`skills/` mirrors its place under `~/.claude`; `plugins/` holds plugins this
repository publishes as a marketplace. Every artifact documents itself in its own
README.

## Skills

| Skill | What it does |
|---|---|
| [/dream](./skills/dream/) | Nightly memory consolidation — reads your recent sessions, proposes memory changes with your own words as evidence. Nothing is written without your approval. |

## Plugins

| Plugin | What it does |
|---|---|
| [context-bar](./plugins/context-bar/) | The context window as a stacked bar above the prompt, one color per `/context` category, with the model, effort, a breakdown, plan usage and settings one click away. |

## Installing

Each artifact's README has its install steps: skills are copied into
`~/.claude/skills/`, plugins install from this repository's marketplace with
`/plugin install`.

## License

[MIT](./LICENSE.txt)
