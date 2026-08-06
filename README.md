# claude-code-toolkit

A personal toolkit for [Claude Code](https://docs.claude.com/en/docs/claude-code) —
skills today; agents, hooks, and other extensions as they earn their place.
Each top-level folder mirrors its location under `~/.claude`, and every
artifact documents itself in its own README.

## Skills

| Skill | What it does |
|---|---|
| [/dream](./skills/dream/) | Nightly memory consolidation — reads your recent sessions, proposes memory changes with your own words as evidence. Nothing is written without your approval. |

## Installing

Copy the folder you want into the same place under your Claude home:

```bash
cp -r skills/<name> ~/.claude/skills/<name>
```

Then see that artifact's README for any setup it needs (memory store,
scheduling, hooks). Everything here is self-contained: one folder in, one
folder out.

## License

[MIT](./LICENSE.txt)
