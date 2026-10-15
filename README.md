# overlord

> If unsure, propose — don't act.

A personal toolkit for [Claude Code](https://docs.claude.com/en/docs/claude-code) —
skills and mods today; agents and other extensions as they earn their place.
`skills/` mirrors its place under `~/.claude`; `mods/` holds mods (plugins with a
hooks module) this repository publishes as a marketplace. Every artifact documents
itself in its own README.

## Skills

| Skill | What it does |
|---|---|
| [/dream](./skills/dream/) | Nightly memory consolidation — reads your recent sessions, proposes memory changes with your own words as evidence. Nothing is written without your approval. |

## Mods

| Mod | What it does |
|---|---|
| [context-bar](./mods/context-bar/) | The context window as a stacked bar above the prompt, with its breakdown, plan usage and settings one click away. |

## Installing

Each artifact's README has its install steps: skills are copied into
`~/.claude/skills/`, mods install from this repository's marketplace with
`/plugin install`.

## Contributing

After merging a pull request that adds a version to [CHANGELOG.md](./CHANGELOG.md), publish it as a GitHub
release: the tag on the merge commit, the tag as its title, and notes listing the changes by component
(`Context bar: …`), ending with a link to the changelog.

```bash
gh release create v1.8.2 --target <merge commit> --title v1.8.2 --notes-file notes.md
```

## License

[MIT](./LICENSE.txt)
