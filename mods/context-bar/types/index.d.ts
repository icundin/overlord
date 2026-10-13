export type Row = { name: string; color: string; tokens: number; kind: 'used' | 'free' | 'buffer' | 'deferred' }

export type Usage = {
  rows: Row[]
  totalTokens: number
  maxTokens: number
  percentage: number
  autoCompactThreshold: number | null
  model: string
  window: number
  limits: Limit[]
  mcpServers: McpServer[]
  memoryFiles: MemoryFile[]
  skills: Skill[]
  // The session's cost in US dollars, as /cost totals it; null where no ledger is kept.
  cost: number | null
}

// One plan usage window: `five_hour`, `seven_day`, a gateway's `spend_limit`.
export type Limit = { kind: string; percentUsed: number; resetsAt: string | null }

// The MCP tools the context carries, one row per server.
export type McpServer = { server: string; tools: number; tokens: number }

// Where a skill comes from: the engine's `source`, and the plugin's name for a plugin's skill.
export type Skill = { name: string; source: string; pluginName?: string; tokens: number }

export type Growth = {
  startTokens: number | null
  startCost: number | null
  lastDelta: number | null
  lastCost: number | null
  deltas: number[]
}

// `type` is the engine's word for where it comes from: `User`, `Project`, `AutoMem`, ...
export type MemoryFile = { path: string; type: string; tokens: number }

// A collapsible section of a card.
export type Section = 'categories' | 'mcp' | 'memory' | 'skills' | 'general' | 'warnings' | 'appearance' | 'limits' | 'session' | 'tokens'

export type Tokens = { input: number; output: number; cacheRead: number; cacheWrite: number }

// What the mod has counted itself, from `since` on: every model request's tokens by model, the time
// spent waiting on the API, and the time the main loop's turns ran.
export type Tally = { since: number; apiMs: number; activeMs: number; models: Record<string, Tokens> }

// The settings card's values, kept in $.store so they carry over to new sessions. A percentage of 0 is off.
// `displayMode` puts the bar's shades on black or white; `auto` follows Claude Code's theme. `categoryTheme`
// colors the categories: `default` (the desktop app's hues), a named theme (the mod's CATEGORY_THEMES), or
// `custom`, where `customColors` maps a category's name to a color.
export type BarSettings = {
  showOnStart: boolean
  contextWarnPercent: number
  limitWarnPercent: number
  // US dollars; 0 is off.
  costWarnUsd: number
  displayMode: 'auto' | 'dark' | 'light'
  categoryTheme: 'default' | 'monokai' | 'dracula' | 'nord' | 'catppuccin' | 'github' | 'gruvbox' | 'tokyo-night' | 'custom'
  customColors: Record<string, string>
}

// The actions that ask before they run: /compact, /clear (a new session), and resetting the settings.
export type Confirmable = 'compact' | 'clear' | 'reset'

export type Segment = Row & { cells: number }

export type Panel = 'breakdown' | 'usage' | 'settings' | 'model' | 'effort'

declare module 'claude-code' {
  interface PluginState {
    'context-bar': {
      usage: Usage | null
      isHidden: boolean
      effort: string | null
      panel: Panel | null
      fill: number
      // Sections the person opened or closed in the open card; the rest keep their default.
      sections: Partial<Record<Section, boolean>>
      tally: Tally | null
      // The action a first click armed; a second click runs it, five seconds without one disarms it.
      confirming: Confirmable | null
      // Whether the theme is a light one, so the bar's shades sit on white instead of black.
      isLight: boolean
      // The /model choices the config menu lists, read live so a new model shows up by itself.
      models: string[]
      // The context's size and the cost when the running turn began, what the last turn added to each, and the
      // last few turns' growth, which the header projects forward.
      growth: Growth
      // Subagents and teammates running now, as $.agent.list() last reported them.
      runningAgents: number
      // Set once the session's first start applied the showOnStart setting; a reload leaves it alone.
      isInitialized: boolean
      settings: BarSettings
      // Counts Enters in the settings fields; part of each field's key, so every Enter draws it afresh.
      fieldRevision: number
    }
  }
}
