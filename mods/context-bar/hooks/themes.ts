// The categories' colors: the default theme, the named ones, and custom picks.

import type { Row } from '../types'

// The default theme: the desktop app's hue for each category, in the agent colors of Claude Code's own themes
// (the same in its dark and light ones), as hex so the settings card can show them. Matched by name, the only
// identity a category has; a name not here falls back to its own color.
const CATEGORY_COLORS: Record<string, string> = {
  Messages: '#6A9BCC', // blue
  'System tools': '#D97757', // orange
  'MCP tools': '#16A34A', // green
  Skills: '#CA8A04', // yellow
  'System prompt': '#0891B2', // cyan
  'Memory files': '#C46686', // pink
  'MCP server instructions': '#827DBD', // purple
}

// Theme keys that draw grey, and the colors a grey category may take instead: red, then the default theme's.
const GREYS = new Set(['inactive', 'subtle', 'promptBorder'])

const SPARE_COLORS = ['#DC2626', ...Object.values(CATEGORY_COLORS)]

// Colors the used rows as the desktop app does; any other used row drawn in a grey gets a color no
// other row uses, so none blends with the free space.
export function distinctColors(rows: Row[]): Row[] {
  const mapped = rows.map(row => {
    const color = row.kind === 'used' ? CATEGORY_COLORS[row.name] : undefined

    return color ? { ...row, color } : row
  })
  const taken = new Set(mapped.map(row => row.color))
  const spare = SPARE_COLORS.filter(color => !taken.has(color))

  return mapped.map(row =>
    row.kind === 'used' && GREYS.has(row.color) && spare.length > 0 ? { ...row, color: spare.shift() ?? row.color } : row,
  )
}

// Each named category theme: the color of every category it knows, following the desktop app's hues where the
// theme has them (messages blue, system tools orange, MCP tools green, skills yellow, system prompt cyan, memory
// files pink, MCP server instructions the theme's remaining hue).
export const CATEGORY_THEMES = {
  // Monokai: six accents, so MCP tools and the MCP server instructions share its green.
  monokai: {
    Messages: '#66D9EF',
    'System tools': '#FD971F',
    'MCP tools': '#A6E22E',
    Skills: '#E6DB74',
    'System prompt': '#AE81FF',
    'Memory files': '#F92672',
    'MCP server instructions': '#A6E22E',
  },
  // Dracula (spec.draculatheme.com): no blue, so messages take its purple.
  dracula: {
    Messages: '#BD93F9',
    'System tools': '#FFB86C',
    'MCP tools': '#50FA7B',
    Skills: '#F1FA8C',
    'System prompt': '#8BE9FD',
    'Memory files': '#FF79C6',
    'MCP server instructions': '#FF5555',
  },
  // Nord (nordtheme.com): frost and aurora.
  nord: {
    Messages: '#81A1C1',
    'System tools': '#D08770',
    'MCP tools': '#A3BE8C',
    Skills: '#EBCB8B',
    'System prompt': '#88C0D0',
    'Memory files': '#B48EAD',
    'MCP server instructions': '#BF616A',
  },
  // Catppuccin Mocha (catppuccin.com/palette).
  catppuccin: {
    Messages: '#89B4FA',
    'System tools': '#FAB387',
    'MCP tools': '#A6E3A1',
    Skills: '#F9E2AF',
    'System prompt': '#89DCEB',
    'Memory files': '#F5C2E7',
    'MCP server instructions': '#CBA6F7',
  },
  // GitHub Dark Default, its terminal palette: no orange, so system tools take its coral red.
  github: {
    Messages: '#58A6FF',
    'System tools': '#FF7B72',
    'MCP tools': '#3FB950',
    Skills: '#D29922',
    'System prompt': '#39C5CF',
    'Memory files': '#FFA198',
    'MCP server instructions': '#BC8CFF',
  },
  // Gruvbox dark, its bright colors (morhetz/gruvbox).
  gruvbox: {
    Messages: '#83A598',
    'System tools': '#FE8019',
    'MCP tools': '#B8BB26',
    Skills: '#FABD2F',
    'System prompt': '#8EC07C',
    'Memory files': '#D3869B',
    'MCP server instructions': '#FB4934',
  },
  // Tokyo Night (folke/tokyonight.nvim).
  'tokyo-night': {
    Messages: '#7AA2F7',
    'System tools': '#FF9E64',
    'MCP tools': '#9ECE6A',
    Skills: '#E0AF68',
    'System prompt': '#7DCFFF',
    'Memory files': '#F7768E',
    'MCP server instructions': '#BB9AF7',
  },
} as const satisfies Record<string, Record<string, string>>

export type ThemeName = keyof typeof CATEGORY_THEMES

// The used rows in the category theme's colors: as they are for `default`, a named theme's, or the person's own.
export function themed(rows: Row[], theme: 'default' | ThemeName | 'custom', custom: Record<string, string>): Row[] {
  const named: Record<string, string> | undefined = theme === 'default' || theme === 'custom' ? undefined : CATEGORY_THEMES[theme]
  const colorOf = (row: Row) => (theme === 'custom' ? custom[row.name] : named?.[row.name])

  return rows.map(row => (row.kind === 'used' ? { ...row, color: colorOf(row) ?? row.color } : row))
}
