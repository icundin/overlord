import { expect, test } from 'claude-code/testing'

import { CATEGORIES } from './fixtures'
import { balanced, grid, longestFitting, ordered, reveal, segments, shortPaths } from './layout'

test('fills the width exactly and leaves deferred rows out', async () => {
  const bar = segments(CATEGORIES, 37)
  expect(bar.reduce((sum, seg) => sum + seg.cells, 0)).toBe(37)
  expect(bar.map(seg => seg.name)).not.toContain('MCP tools')
})

test('keeps two cells for a compact buffer too small for them', async () => {
  const rows = CATEGORIES.map(row => (row.kind === 'buffer' ? { ...row, tokens: 100 } : row))
  const bar = segments(rows, 37)
  expect(bar.find(seg => seg.kind === 'buffer')?.cells).toBe(2)
  expect(bar.reduce((sum, seg) => sum + seg.cells, 0)).toBe(37)
})

test('ends the bar with the compact buffer even when the engine lists it before the free space', async () => {
  const [free, buffer] = [CATEGORIES[3], CATEGORIES[4]]
  const listed = [...CATEGORIES.slice(0, 3), ...(buffer && free ? [buffer, free] : [])]
  expect(segments(listed, 37).map(seg => seg.kind).at(-1)).toBe('buffer')
})

test('keeps a cell for a used row too small for one', async () => {
  const tiny = [...CATEGORIES, { name: 'Agents', tokens: 100, color: 'merged', isDeferred: false, kind: 'used' as const }]
  const bar = segments(tiny, 37)
  expect(bar.find(seg => seg.name === 'Agents')?.cells).toBe(1)
  expect(bar.reduce((sum, seg) => sum + seg.cells, 0)).toBe(37)
})

test('balances the legend over as many columns as fit', async () => {
  const eight = [1, 2, 3, 4, 5, 6, 7, 8]
  expect(grid(eight, 28, 3, 130).map(row => row.length)).toEqual([4, 4])
  expect(grid(eight, 28, 3, 100).map(row => row.length)).toEqual([3, 3, 2])
  expect(grid(eight, 28, 3, 40).length).toBe(8)
})

test('reveals the used cells from the left', async () => {
  const bar = segments(CATEGORIES, 40)
  const used = (list: typeof bar) => list.filter(seg => seg.kind === 'used').reduce((sum, seg) => sum + seg.cells, 0)
  const half = reveal(bar, 0.5)
  expect(used(half)).toBe(Math.round(used(bar) / 2))
  expect(half.reduce((sum, seg) => sum + seg.cells, 0)).toBe(40)
  expect(used(reveal(bar, 0))).toBe(0)
})

test('lists used rows by size, then buffer, free space and deferred', async () => {
  expect(ordered(CATEGORIES).map(row => row.name)).toEqual([
    'Messages',
    'System prompt',
    'Autocompact buffer',
    'Free space',
    'MCP tools',
  ])
})

test('shortens memory file paths, keeping as many folders as tell them apart', async () => {
  expect(
    shortPaths([
      '/Users/me/.claude/CLAUDE.md',
      '/Users/me/.claude/memory/MEMORY.md',
      '/Users/me/.claude/projects/-Users-me-Code-app/memory/MEMORY.md',
    ]),
  ).toEqual(['.claude/CLAUDE.md', '.claude/memory/MEMORY.md', '-Users-me-Code-app/memory/MEMORY.md'])
})

test('shortens Windows paths too, keeping their backslashes', async () => {
  expect(
    shortPaths([
      'C:\\Users\\me\\.claude\\CLAUDE.md',
      'C:\\Users\\me\\.claude\\memory\\MEMORY.md',
      'C:\\Users\\me\\.claude\\projects\\C--Users-me-Code-app\\memory\\MEMORY.md',
    ]),
  ).toEqual(['.claude\\CLAUDE.md', '.claude\\memory\\MEMORY.md', 'C--Users-me-Code-app\\memory\\MEMORY.md'])
})

test('fits the header detail to the width', async () => {
  expect(longestFitting(['a long one', 'short', ''], 7)).toBe('short')
  expect(longestFitting(['a long one', 'short', ''], 3)).toBe('')
})

test('wraps a paragraph into even lines, never one word alone on the last', async () => {
  const tip = 'Longer sessions cost more, even when cached. Compact mid-task, and start a new session when you switch tasks.'
  for (let width = 20; width <= 200; width += 1) {
    const lines = balanced(tip, width)
    expect(lines.join(' ')).toBe(tip)
    expect(lines.every(line => line.length <= width)).toBe(true)
    expect(lines.length === 1 || (lines.at(-1) ?? '').includes(' ')).toBe(true)
  }
  expect(balanced(tip, 108)).toEqual([
    'Longer sessions cost more, even when cached. Compact',
    'mid-task, and start a new session when you switch tasks.',
  ])
  expect(balanced(tip, 200)).toEqual([tip])
})
