import { expect, test } from 'claude-code/testing'

import { FIRST_DRAFT, nextInterval, readChoices, toggled } from './choices'

test('reads stored choices, dropping what this version does not know', async () => {
  expect(readChoices({ items: ['cost', 'gone', 'user'], icons: true, interval: 5 })).toEqual({ items: ['user', 'cost'], icons: true, interval: 5 })
  expect(readChoices({ items: [], icons: 'yes', interval: 7 })).toEqual({ items: [], icons: false, interval: FIRST_DRAFT.interval })
  expect(readChoices(undefined)).toBeNull()
  expect(readChoices({ icons: true })).toBeNull()
})

test('keeps the items in the line order whatever order they are turned on', async () => {
  expect(toggled(['cost', 'user'], 'folder')).toEqual(['user', 'folder', 'cost'])
  expect(toggled(['user', 'folder'], 'user')).toEqual(['folder'])
})

test('moves the refresh interval on, back to the first after the last', async () => {
  expect([nextInterval(1), nextInterval(5), nextInterval(10)]).toEqual([2, 10, 1])
})
