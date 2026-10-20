import { expect, test } from 'claude-code/testing'

import type { ThemeChoice } from '../types'
import { ansi, colorOf, nextTheme, parseColor, THEME_CHOICES } from './themes'

const choices = (theme: ThemeChoice, colors = {}) => ({ items: [], resets: [], icons: false, interval: 2, theme, colors })

test('colors each section in the theme, the default one in context-bar’s own hues', async () => {
  expect([colorOf(choices('default'), 'clock', 'system'), colorOf(choices('default'), 'branch', 'git'), colorOf(choices('default'), 'model', 'agent')]).toEqual([
    '#6A9BCC',
    '#16A34A',
    '#D97757',
  ])
  expect([colorOf(choices('dracula'), 'folder', 'system'), colorOf(choices('dracula'), 'pr', 'git'), colorOf(choices('dracula'), 'cost', 'agent')]).toEqual([
    '#BD93F9',
    '#50FA7B',
    '#FFB86C',
  ])
})

test('leaves the line uncolored with no theme', async () => {
  expect(colorOf(choices('none'), 'branch', 'git')).toBeNull()
})

test('takes a custom color per item, the default theme’s where none is set', async () => {
  const custom = choices('custom', { branch: '#FF0000' })
  expect([colorOf(custom, 'branch', 'git'), colorOf(custom, 'repo', 'git'), colorOf(custom, 'model', 'agent')]).toEqual(['#FF0000', '#16A34A', '#D97757'])
})

test('moves the theme on through every choice, back to none after custom', async () => {
  expect(THEME_CHOICES[0]).toBe('none')
  expect(nextTheme('none')).toBe('default')
  expect(nextTheme('tokyo-night')).toBe('custom')
  expect(nextTheme('custom')).toBe('none')
})

test('writes a 24-bit color code around the text, back to the line’s own color after it', async () => {
  expect(ansi('main', '#16A34A')).toBe('\u001b[38;2;22;163;74mmain\u001b[39m')
  expect(ansi('main', null)).toBe('main')
})

test('reads a hex color as CSS writes one', async () => {
  expect([parseColor('#ff6188'), parseColor('F68'), parseColor(' #16a34a '), parseColor('red'), parseColor('')]).toEqual([
    '#FF6188',
    '#FF6688',
    '#16A34A',
    null,
    null,
  ])
})
