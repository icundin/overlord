# claude-code-toolkit

> If unsure, propose — don't act.

A personal toolkit for [Claude Code](https://docs.claude.com/en/docs/claude-code) —
skills and plugins today; agents and other extensions as they earn their place. Each
top-level folder mirrors its location under `~/.claude`, and every artifact
documents itself in its own README.

## Skills

| Skill | What it does |
|---|---|
| [/dream](./skills/dream/) | Nightly memory consolidation — reads your recent sessions, proposes memory changes with your own words as evidence. Nothing is written without your approval. |

## Plugins

| Plugin | What it does |
|---|---|
| [context-bar](./plugins/context-bar/) | The context window as a stacked bar above the prompt, one color per `/context` category, with the model, effort, a breakdown, plan usage and settings one click away. |

## Installing

A skill: copy its folder into the same place under your Claude home:

```bash
cp -r skills/<name> ~/.claude/skills/<name>
```

A plugin: install it from this repository's marketplace, at the Claude Code
prompt:

```
/plugin install <name> --marketplace icundin/claude-code-toolkit
```

Then see that artifact's README for any setup it needs. Everything here is
self-contained: a skill is one folder in, one folder out; a plugin installs
and uninstalls through `/plugin` — no settings surgery.

## License

[MIT](./LICENSE.txt)
