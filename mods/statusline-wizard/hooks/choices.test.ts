import { expect, test } from 'claude-code/testing'

import { cycledWindow, FIRST_DRAFT, nextInterval, readChoices, toggled } from './choices'

test('reads stored choices, dropping what this version does not know', async () => {
  expect(readChoices({ items: ['cost', 'gone', 'user'], icons: true, interval: 5 })).toEqual({ items: ['user', 'cost'], resets: [], icons: true, interval: 5 })
  expect(readChoices({ items: [], icons: 'yes', interval: 7 })).toEqual({ items: [], resets: [], icons: false, interval: FIRST_DRAFT.interval })
  // A countdown is kept only for a window shown.
  expect(readChoices({ items: ['weekly'], resets: ['session', 'weekly', 'gone'], icons: false, interval: 2 })?.resets).toEqual(['weekly'])
  expect(readChoices(undefined)).toBeNull()
  expect(readChoices({ icons: true })).toBeNull()
})

test('keeps the items in the line order whatever order they are turned on', async () => {
  expect(toggled(['cost', 'user'], 'folder')).toEqual(['user', 'folder', 'cost'])
  expect(toggled(['user', 'folder'], 'user')).toEqual(['folder'])
})

test('moves a plan window from off to on, then with its reset, then off', async () => {
  const off = { ...FIRST_DRAFT, items: [], resets: [] }
  const on = cycledWindow(off, 'weekly')
  expect([on.items, on.resets]).toEqual([['weekly'], []])
  const withReset = cycledWindow(on, 'weekly')
  expect([withReset.items, withReset.resets]).toEqual([['weekly'], ['weekly']])
  const again = cycledWindow(withReset, 'weekly')
  expect([again.items, again.resets]).toEqual([[], []])
})

test('moves the refresh interval on, back to the first after the last', async () => {
  expect([nextInterval(1), nextInterval(5), nextInterval(10)]).toEqual([2, 10, 1])
})
