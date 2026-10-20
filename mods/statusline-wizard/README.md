# statusline-wizard

A Claude Code mod (a plugin with a hooks module): a personal status line from the items you tick in a pane, with no
script to write.

```
👤 inigo@mac  📁 ~/Code/overlord  🌿 main ↑2 ●  🤖 Opus 5.5  🧠 high  📊 5%  ⏳ 5h 12% · 7d 8%  💰 $0.17
```

## Requirements

- Claude Code 2.1.303 or later, the release it is built and tested on. Mods are an early-access surface that may
  change between releases.
- The pane is drawn in the terminal; the line itself shows wherever Claude Code shows its status line.
- `git` for the branch items, and the [GitHub CLI](https://cli.github.com) (`gh`, signed in) for the pull request.
- Tested on macOS. Under WSL Claude Code runs as on Linux; native Windows is untested: see [Windows](#windows).

## Install

At the Claude Code prompt:

```
/plugin install statusline-wizard --marketplace icundin/overlord
```

Answer `y` to add the marketplace, then pick a scope (user, for every session), and run `/statusline-wizard`.

Optional, to try it from a local clone of this repository before it is published:

```
/plugin install statusline-wizard --marketplace /path/to/overlord
```

## Update and uninstall

From a shell:

```bash
claude plugin marketplace update overlord
claude plugin update statusline-wizard@overlord
```

Then run `/reload-plugins` in a running session, or start a new one, to apply it.

Before uninstalling, open `/statusline-wizard` and press **remove** twice, so your settings get back the status
line they had. Then:

```bash
claude plugin uninstall statusline-wizard@overlord
```

## Using it

`/statusline-wizard` opens two cards: **Settings**, and below it **Preview**, the line as your choices draw it in
this session.

In **Settings**, click a value to change it:

- **System, Git, Agent**: an item each, on or off. The line shows them in this order:

  | Item | Shows | Icon |
  |---|---|---|
  | user@host | `inigo@mac` | 👤 |
  | folder | `~/Code/overlord` | 📁 |
  | branch | `main` | 🌿 |
  | ↑ not pushed | `↑2`, only when there are some | |
  | ● changes | `●`, only when there are some | |
  | repository | `icundin/overlord`, from the `origin` remote | 📦 |
  | pull request | `PR #26 approved`, the branch's open one | 🔀 |
  | model | `Opus 5.5` | 🤖 |
  | effort | `high` | 🧠 |
  | context | `ctx 5%` (`📊 5%` with icons) | 📊 |
  | plan usage | `5h 12% · 7d 8%`, on a subscription | ⏳ |
  | cost | `$0.17` | 💰 |

  An item with nothing to show (no repository, no pull request) is left out of the line.
- **Appearance**: icons on or off, and how often Claude Code redraws the line besides its own updates (every 1, 2,
  3, 5 or 10 seconds).

Then:

- **save** keeps your choices for every session. When it also has to set the status line in
  `~/.claude/settings.json` (the first time, or for a new refresh interval), the first press turns it red and says
  so, and the second writes it. The file as it was is kept beside it as `settings.json.statusline-wizard.bak`, and
  the status line it replaced is kept to restore.
- **remove**, once the line is the wizard's, puts back the status line you had before, or none, on a second press.
- **close** (or Esc) closes the pane; choices not saved yet are dropped. Any other click disarms a red button.

The pane stays open after a save or a remove, so you can watch the status line change and keep adjusting. A dot
beside **Settings** marks choices not saved yet.

A save in one session reaches the others within five seconds.

## How it works

Each session's mod draws its own line and keeps it in the `STATUSLINE_WIZARD_LINE` env var. The command saved in
your settings only prints that variable: `echo "$STATUSLINE_WIZARD_LINE"`, or `$env:STATUSLINE_WIZARD_LINE` where
Claude Code runs commands in PowerShell. Claude Code re-runs it at the interval you picked, and every run sees the
mod's latest line. So there is no script and no `jq`, and the same command serves every session.

The mod reads the git state every five seconds (`git --no-optional-locks status`, which never takes the lock your
own git commands need), the pull request at most once a minute and only while its item is on, and the figures after
each turn.

## Limits

- The line is empty until the mod has drawn it, for a moment as a session starts, and stays empty in a session
  where the mod is not loaded or is disabled.
- Until the session's first request the effort is the one `/effort` saved, and the context is Claude Code's local
  estimate: Claude Code tells mods neither figure before then.
- The session name is not available to mods, so it is not an item.
- Changes made outside the session (a commit in another terminal) show within five seconds; the pull request's
  state, within a minute.
- `$.store` keeps the choices per plugin and marketplace, so a copy loaded with `--plugin-dir` keeps its own.

## Windows

Claude Code runs a status line command through Git Bash when it finds it (`CLAUDE_CODE_GIT_BASH_PATH`,
`C:\Program Files\Git\bin\bash.exe`, or beside the `git` on the PATH), and through PowerShell otherwise. **save**
looks in the same places and writes the matching command. This is untested on Windows so far. To check it:

1. Install the mod as above and run `/statusline-wizard`.
2. Turn a few items on, and icons, then press **save** twice.
3. Within a few seconds the status line under the prompt shows what the preview showed, icons included.
4. In `%USERPROFILE%\.claude\settings.json`, `statusLine.command` is `echo "$STATUSLINE_WIZARD_LINE"` with Git for
   Windows installed, and `$env:STATUSLINE_WIZARD_LINE` without it.
5. Run `/statusline-wizard` again and press **remove** twice: the previous status line comes back.

[Reports welcome](https://github.com/icundin/overlord/issues), with what each step showed.

## Developing

The mod's tests and its manifest check, from the repository's root:

```bash
claude plugin test mods/statusline-wizard
claude plugin validate mods/statusline-wizard
```

`claude --plugin-dir mods/statusline-wizard` starts a session with this folder loaded, without installing it.
