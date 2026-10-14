import { expect, test } from 'claude-code/testing'

import { distinctColors, lighter } from './themes'

test('colors the categories as the desktop app does', async () => {
  const rows = distinctColors([
    { name: 'Messages', tokens: 1, color: 'purple_FOR_SUBAGENTS_ONLY', kind: 'used' },
    { name: 'System tools', tokens: 1, color: 'inactive', kind: 'used' },
    { name: 'System prompt', tokens: 1, color: 'promptBorder', kind: 'used' },
    { name: 'Custom agents', tokens: 1, color: 'inactive', kind: 'used' },
    { name: 'Free space', tokens: 1, color: 'promptBorder', kind: 'free' },
  ])
  expect(rows.map(row => row.color)).toEqual(['#6A9BCC', '#D97757', '#0891B2', '#DC2626', 'promptBorder'])
})

test('lightens a hex color for a hovered solid segment, and leaves a theme key alone', async () => {
  expect([lighter('#6A9BCC'), lighter('#000000'), lighter('#FFFFFF')]).toEqual(['#9EBEDE', '#595959', '#FFFFFF'])
  expect(lighter('inactive')).toBeNull()
})
