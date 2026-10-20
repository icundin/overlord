// One item the line can show, in the order the line shows them.
export type ItemKey =
  | 'clock'
  | 'user'
  | 'folder'
  | 'repo'
  | 'branch'
  | 'ahead'
  | 'behind'
  | 'dirty'
  | 'counts'
  | 'pr'
  | 'model'
  | 'effort'
  | 'context'
  | 'tokens'
  | 'session'
  | 'weekly'
  | 'spend'
  | 'cost'

// A plan window the line can show: the five-hour session, the seven-day week, a gateway's spend limit.
export type Window = 'session' | 'weekly' | 'spend'

// The kinds of item a theme gives a color each.
export type Hue = 'system' | 'git' | 'pr' | 'model' | 'context' | 'usage' | 'cost'

// A named theme, from context-bar's palettes.
export type ThemeName = 'default' | 'monokai' | 'dracula' | 'nord' | 'catppuccin' | 'github' | 'gruvbox' | 'tokyo-night' | 'material'

// How the line is colored: none, a theme, or a color per item.
export type ThemeChoice = 'none' | ThemeName | 'custom'

// What the person picked: the items shown, the windows shown with how long until they reset, whether each item wears
// its icon, how often Claude Code re-runs the command, the theme, and the custom colors (`#RRGGBB`) by item.
export type Choices = {
  items: ItemKey[]
  resets: Window[]
  icons: boolean
  interval: number
  theme: ThemeChoice
  colors: Partial<Record<ItemKey, string>>
}

// The working copy's state, from one `git status --porcelain=v2 --branch`: the commits ahead of and behind its
// upstream, and the files staged, modified and untracked.
export type Git = { branch: string; ahead: number; behind: number; isDirty: boolean; staged: number; modified: number; untracked: number }

// The open pull request of the branch, as `gh pr view` has it.
export type PullRequest = { number: number; review: 'draft' | 'approved' | 'changes requested' | 'review required' | null }

// One plan usage window: `five_hour`, `seven_day`, a gateway's `spend_limit`; when it resets, where it says.
export type Limit = { kind: string; percentUsed: number; resetsAt: string | null }

// What the line is drawn from; null where the session has no reading yet.
export type Facts = {
  user: string | null
  host: string | null
  home: string | null
  cwd: string | null
  git: Git | null
  repo: string | null
  pr: PullRequest | null
  model: string | null
  effort: string | null
  context: number | null
  tokens: { used: number; window: number } | null
  limits: Limit[]
  cost: number | null
  // The time the line was last drawn at, and as the clock shows it.
  now: number | null
  time: string | null
}

// The pane's sections of items, and with them its collapsible ones.
export type Group = 'system' | 'git' | 'agent'
export type Section = Group | 'appearance'

// A change to the settings file waiting for the second press: what `statusLine` becomes, null for none.
export type Pending = { action: 'save' | 'remove'; after: unknown }

declare module 'claude-code' {
  interface PluginState {
    'statusline-wizard': {
      facts: Facts
      draft: Choices | null
      pending: Pending | null
      // Which sections are open; each is open until closed.
      opened: Partial<Record<Section, boolean>>
      // Moves on with each color typed, so its field is drawn anew.
      fieldRevision: number
      // The choices as last saved, null before the first save.
      saved: Choices | null
      // Whether the settings file's `statusLine` is the wizard's, as last read.
      isInstalled: boolean
      // Whether setUp has filled the session's state; a /clear empties it.
      isSetUp: boolean
    }
  }
}
