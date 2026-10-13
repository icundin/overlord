// Values typed into the settings fields.

// A whole percentage from 0 to 100 typed into a field, or null.
export function parsePercent(text: string): number | null {
  const value = Number(text.trim().replace(/%$/, ''))

  return Number.isInteger(value) && value >= 0 && value <= 100 ? value : null
}

// A dollar amount typed into a field, `$` and cents optional (`50`, `$12.50`); null when it is not one.
export function parseAmount(text: string): number | null {
  const typed = text.trim().replace(/^\$/, '')

  return /^\d+(\.\d{1,2})?$/.test(typed) ? Number(typed) : null
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
