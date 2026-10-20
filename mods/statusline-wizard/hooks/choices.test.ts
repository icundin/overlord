import { expect, test } from 'claude-code/testing'

import { cycledWindow, FIRST_DRAFT, parseInterval, readChoices, toggled } from './choices'

test('reads stored choices, dropping what this version does not know', async () => {
  const plain = { resets: [], theme: 'none', colors: {} }
  expect(readChoices({ items: ['cost', 'gone', 'user'], icons: true, interval: 5 })).toEqual({ items: ['user', 'cost'], icons: true, interval: 5, ...plain })
  expect(readChoices({ items: [], icons: 'yes', interval: 7 })).toEqual({ items: [], icons: false, interval: 7, ...plain })
  // An interval Claude Code would not take reads as the first draft's.
  expect([0, 1.5, -3, '5'].map(interval => readChoices({ items: [], icons: false, interval })?.interval)).toEqual([2, 2, 2, 2])
  // A theme this version does not know reads as none, and only colors it can read are kept.
  const colored = readChoices({ items: ['branch'], icons: false, interval: 2, theme: 'dracula', colors: { branch: '#FF0000', repo: 'red', gone: '#00FF00' } })
  expect([colored?.theme, colored?.colors]).toEqual(['dracula', { branch: '#FF0000' }])
  expect(readChoices({ items: [], icons: false, interval: 2, theme: 'neon' })?.theme).toBe('none')
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

test('reads a refresh interval typed as whole seconds, one or more, as Claude Code takes it', async () => {
  expect([parseInterval('5'), parseInterval(' 30 '), parseInterval('120'), parseInterval('1')]).toEqual([5, 30, 120, 1])
  expect([parseInterval('0'), parseInterval('1.5'), parseInterval('2s'), parseInterval(''), parseInterval('-4')]).toEqual([null, null, null, null, null])
})
