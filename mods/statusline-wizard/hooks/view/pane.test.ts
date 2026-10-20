import { expect, test } from 'claude-code/testing'

import { plain } from '../line'
import { wrap } from './pane'

const piece = (text: string) => [{ text, color: null }]
const shown = (rows: ReturnType<typeof wrap>) => rows.map(row => row.map(plain).join('  '))

test('wraps the preview between items, never inside one, a pictograph two cells wide', async () => {
  const parts = [piece('👤 me@mac'), piece('📁 ~/Code/overlord'), piece('🌿 main ↑2 ●')]
  expect(shown(wrap(parts, 80))).toEqual(['👤 me@mac  📁 ~/Code/overlord  🌿 main ↑2 ●'])
  expect(shown(wrap(parts, 30))).toEqual(['👤 me@mac  📁 ~/Code/overlord', '🌿 main ↑2 ●'])
  expect(shown(wrap([piece('a-very-long-folder-name')], 10))).toEqual(['a-very-long-folder-name'])
  expect(wrap([], 10)).toEqual([])
})
