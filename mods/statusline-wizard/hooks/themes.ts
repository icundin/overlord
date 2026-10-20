import type { Choices, Group, ItemKey, ThemeChoice, ThemeName } from '../types'

// Each theme's color for a section, from context-bar's palettes: System takes its messages blue, Git its MCP tools
// green, Agent its system tools orange. Default is the desktop app's hues, as context-bar's default theme.
export const THEMES: Record<ThemeName, Record<Group, string>> = {
  default: { system: '#6A9BCC', git: '#16A34A', agent: '#D97757' },
  monokai: { system: '#66D9EF', git: '#A6E22E', agent: '#FD971F' },
  dracula: { system: '#BD93F9', git: '#50FA7B', agent: '#FFB86C' },
  nord: { system: '#81A1C1', git: '#A3BE8C', agent: '#D08770' },
  catppuccin: { system: '#89B4FA', git: '#A6E3A1', agent: '#FAB387' },
  github: { system: '#58A6FF', git: '#3FB950', agent: '#FF7B72' },
  gruvbox: { system: '#83A598', git: '#B8BB26', agent: '#FE8019' },
  'tokyo-night': { system: '#7AA2F7', git: '#9ECE6A', agent: '#FF9E64' },
}

// In the order the Appearance row moves through them: none keeps the line uncolored, custom takes a color per item.
export const THEME_CHOICES: ThemeChoice[] = ['none', ...(Object.keys(THEMES) as ThemeName[]), 'custom']

export function nextTheme(theme: ThemeChoice): ThemeChoice {
  return THEME_CHOICES[(THEME_CHOICES.indexOf(theme) + 1) % THEME_CHOICES.length] ?? 'none'
}

// The color of the item `key`, of section `group`, under the choices' theme, or null for none; a custom color not
// set is the default theme's.
export function colorOf(choices: Choices, key: ItemKey, group: Group): string | null {
  return choices.theme === 'none'
    ? null
    : choices.theme === 'custom'
      ? (choices.colors[key] ?? THEMES.default[group])
      : THEMES[choices.theme][group]
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
