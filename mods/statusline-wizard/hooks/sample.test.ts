import { expect, test } from 'claude-code/testing'

import { ITEMS, line } from './line'
import { SAMPLE } from './sample'

test('previews every item on its own, so none can be chosen and show nothing', async () => {
  for (const item of ITEMS) {
    for (const icons of [false, true]) {
      expect({ key: item.key, shown: line({ items: [item.key], resets: [], icons, interval: 2 }, SAMPLE) }).not.toMatchObject({ shown: '' })
    }
  }
})
