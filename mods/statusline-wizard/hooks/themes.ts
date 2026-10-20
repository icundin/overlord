import type { Choices, Hue, ItemKey, ThemeChoice, ThemeName } from '../types'

// Each theme's color for each kind of item, from context-bar's palettes, every one of its seven colors: the system
// items take its messages color, git its MCP tools, the pull request its MCP server instructions, the model its system
// tools, the context its system prompt, the plan usage its skills, the cost its memory files. Default is the desktop
// app's hues, as context-bar's default theme. Material is Material Theme's dark palette (material-theme.com), the
// same in all its dark variants: blue, green, purple, orange, cyan, yellow, and its red, as it has no pink.
export const THEMES: Record<ThemeName, Record<Hue, string>> = {
  default: { system: '#6A9BCC', git: '#16A34A', pr: '#827DBD', model: '#D97757', context: '#0891B2', usage: '#CA8A04', cost: '#C46686' },
  monokai: { system: '#66D9EF', git: '#A6E22E', pr: '#A6E22E', model: '#FD971F', context: '#AE81FF', usage: '#E6DB74', cost: '#F92672' },
  dracula: { system: '#BD93F9', git: '#50FA7B', pr: '#FF5555', model: '#FFB86C', context: '#8BE9FD', usage: '#F1FA8C', cost: '#FF79C6' },
  nord: { system: '#81A1C1', git: '#A3BE8C', pr: '#BF616A', model: '#D08770', context: '#88C0D0', usage: '#EBCB8B', cost: '#B48EAD' },
  catppuccin: { system: '#89B4FA', git: '#A6E3A1', pr: '#CBA6F7', model: '#FAB387', context: '#89DCEB', usage: '#F9E2AF', cost: '#F5C2E7' },
  github: { system: '#58A6FF', git: '#3FB950', pr: '#BC8CFF', model: '#FF7B72', context: '#39C5CF', usage: '#D29922', cost: '#FFA198' },
  gruvbox: { system: '#83A598', git: '#B8BB26', pr: '#FB4934', model: '#FE8019', context: '#8EC07C', usage: '#FABD2F', cost: '#D3869B' },
  'tokyo-night': { system: '#7AA2F7', git: '#9ECE6A', pr: '#BB9AF7', model: '#FF9E64', context: '#7DCFFF', usage: '#E0AF68', cost: '#F7768E' },
  material: { system: '#82AAFF', git: '#C3E88D', pr: '#C792EA', model: '#F78C6C', context: '#89DDFF', usage: '#FFCB6B', cost: '#F07178' },
}

// In the order the Appearance row moves through them: none keeps the line uncolored, custom takes a color per item.
export const THEME_CHOICES: ThemeChoice[] = ['none', ...(Object.keys(THEMES) as ThemeName[]), 'custom']

export function nextTheme(theme: ThemeChoice): ThemeChoice {
  return THEME_CHOICES[(THEME_CHOICES.indexOf(theme) + 1) % THEME_CHOICES.length] ?? 'none'
}

// The color of the item `key`, of kind `hue`, under the choices' theme, or null for none; a custom color not set is
// the default theme's.
export function colorOf(choices: Choices, key: ItemKey, hue: Hue): string | null {
  return choices.theme === 'none'
    ? null
    : choices.theme === 'custom'
      ? (choices.colors[key] ?? THEMES.default[hue])
      : THEMES[choices.theme][hue]
}

// `text` in a 24-bit color, back to the line's own color after it; as it is with none.
export function ansi(text: string, color: string | null): string {
  if (color === null) {
    return text
  }
  const [r, g, b] = [1, 3, 5].map(at => parseInt(color.slice(at, at + 2), 16))

  return `\u001b[38;2;${r};${g};${b}m${text}\u001b[39m`
}

// A hex color typed into a field, as CSS writes one: `#RRGGBB` or `#RGB` (the `#` optional), as `#RRGGBB`; or null.
export function parseColor(text: string): string | null {
  const hex = text.trim().replace(/^#/, '').toUpperCase()

  if (/^[0-9A-F]{6}$/.test(hex)) {
    return `#${hex}`
  }
  if (/^[0-9A-F]{3}$/.test(hex)) {
    return `#${[...hex].map(digit => digit + digit).join('')}`
  }

  return null
}
