import { expect, test } from 'claude-code/testing'

import { wrap } from './pane'

test('wraps the preview between items, never inside one, a pictograph two cells wide', async () => {
  expect(wrap(['👤 me@mac', '📁 ~/Code/overlord', '🌿 main ↑2 ●'], 80)).toEqual(['👤 me@mac  📁 ~/Code/overlord  🌿 main ↑2 ●'])
  expect(wrap(['👤 me@mac', '📁 ~/Code/overlord', '🌿 main ↑2 ●'], 30)).toEqual(['👤 me@mac  📁 ~/Code/overlord', '🌿 main ↑2 ●'])
  expect(wrap(['a-very-long-folder-name'], 10)).toEqual(['a-very-long-folder-name'])
  expect(wrap([], 10)).toEqual([])
})
