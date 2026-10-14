// Fitting the bar, lists and header into the cells the band has.

import type { Row, Segment } from '../types'

// The compact buffer gets two cells so it reads as a block, not a stray cell.
const MIN_CELLS: Partial<Record<Row['kind'], number>> = { used: 1, buffer: 2 }

// Splits `width` cells across the rows by largest remainder, so the bar is always exactly `width` wide;
// rows below their MIN_CELLS take the shortfall from the largest segment.
export function segments(rows: Row[], width: number): Segment[] {
  // The engine may list the compact buffer before the free space; the bar always ends with it.
  const shown = rows
    .filter(row => row.kind !== 'deferred' && row.tokens > 0)
    .sort((a, b) => Number(a.kind === 'buffer') - Number(b.kind === 'buffer'))
  const total = shown.reduce((sum, row) => sum + row.tokens, 0)

  if (total === 0 || width <= 0) {
    return []
  }

  const exact = shown.map(row => (row.tokens / total) * width)
  const cells = exact.map(Math.floor)
  let left = width - cells.reduce((sum, n) => sum + n, 0)
  const byRemainder = exact
    .map((x, i) => ({ i, rest: x - Math.floor(x) }))
    .sort((a, b) => b.rest - a.rest)

  for (const { i } of byRemainder) {
    if (left <= 0) {
      break
    }
    cells[i] = (cells[i] ?? 0) + 1
    left -= 1
  }

  shown.forEach((row, i) => {
    const min = MIN_CELLS[row.kind] ?? 0

    while ((cells[i] ?? 0) < min) {
      const largest = cells.indexOf(Math.max(...cells))
      if (largest === i || (cells[largest] ?? 0) <= 1) {
        break
      }
      cells[largest] = (cells[largest] ?? 0) - 1
      cells[i] = (cells[i] ?? 0) + 1
    }
  })

  return shown.map((row, i) => ({ ...row, cells: cells[i] ?? 0 }))
}

// Draws the first `portion` (0 to 1) of the used cells in their colors and the rest as free space.
export function reveal(bar: Segment[], portion: number): Segment[] {
  const used = bar.filter(seg => seg.kind === 'used').reduce((sum, seg) => sum + seg.cells, 0)
  let budget = Math.round(used * portion)
  const out: Segment[] = []

  for (const seg of bar) {
    if (seg.kind !== 'used') {
      out.push(seg)
      continue
    }
    const shown = Math.min(seg.cells, budget)
    budget -= shown
    out.push({ ...seg, cells: shown })
    if (shown < seg.cells) {
      out.push({ name: `${seg.name} (pending)`, color: '', tokens: 0, kind: 'free', cells: seg.cells - shown })
    }
  }

  return out
}

// Lays the entries out row by row in as many columns as `width` holds, balanced so no row is nearly empty.
export function grid<T>(entries: T[], entryWidth: number, gap: number, width: number): T[][] {
  const fit = Math.max(1, Math.floor((width + gap) / (entryWidth + gap)))
  const rows = Math.ceil(entries.length / fit)
  const columns = Math.ceil(entries.length / Math.max(1, rows))
  const out: T[][] = []

  for (let i = 0; i < entries.length; i += columns) {
    out.push(entries.slice(i, i + columns))
  }

  return out
}

// The longest of `options` that fits in `width` cells, or the last (the shortest) when none does.
export function longestFitting(options: string[], width: number): string {
  return options.find(option => option.length <= width) ?? options[options.length - 1] ?? ''
}

// Word-wraps `text` into as few lines as `width` allows, as even as they can be, so the last is as full as the rest:
// the narrowest width that needs no more lines.
export function balanced(text: string, width: number): string[] {
  const lines = wrapped(text, width)

  for (let narrower = Math.ceil(text.length / lines.length); narrower < width; narrower += 1) {
    const even = wrapped(text, narrower)
    if (even.length === lines.length) {
      return even
    }
  }

  return lines
}

function wrapped(text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''

  for (const word of text.split(' ')) {
    if (line !== '' && line.length + 1 + word.length > width) {
      lines.push(line)
      line = word
    } else {
      line = line === '' ? word : `${line} ${word}`
    }
  }

  return [...lines, line]
}

const KIND_ORDER: Record<Row['kind'], number> = { used: 0, buffer: 1, free: 2, deferred: 3 }

// The breakdown's order, as the desktop app lists it: used rows by size, then the buffer, the free space,
// and the deferred tool schemas.
export function ordered(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (a.kind === 'used' ? b.tokens - a.tokens : 0))
}

// Each path's last segments, two at least and as many more as it takes to tell it from the others:
// `~/.claude/memory/MEMORY.md` and `~/.claude/projects/x/memory/MEMORY.md` read `.claude/memory/MEMORY.md`
// and `x/memory/MEMORY.md`. A Windows path keeps its backslashes.
export function shortPaths(paths: string[]): string[] {
  const parts = paths.map(path => path.split(/[\\/]/).filter(Boolean))
  const tail = (segments: string[], n: number) => segments.slice(-n).join('/')

  return parts.map((segments, i) => {
    let n = 2
    while (n < segments.length && parts.some((other, j) => j !== i && tail(other, n) === tail(segments, n))) {
      n += 1
    }

    return segments.slice(-n).join(paths[i]?.includes('\\') ? '\\' : '/')
  })
}
