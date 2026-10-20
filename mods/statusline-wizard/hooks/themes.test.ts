import { expect, test } from 'claude-code/testing'

import type { Hue, ThemeChoice } from '../types'
import { ansi, colorOf, nextTheme, parseColor, THEME_CHOICES } from './themes'

const choices = (theme: ThemeChoice, colors = {}) => ({ items: [], resets: [], icons: false, interval: 2, theme, colors })

const HUES: Hue[] = ['system', 'git', 'pr', 'model', 'context', 'usage', 'cost']

const palette = (theme: ThemeChoice) => HUES.map(hue => colorOf(choices(theme), 'clock', hue))

test('colors each kind of item in its color of the theme, the default one in context-bar’s own hues', async () => {
  expect(palette('default')).toEqual(['#6A9BCC', '#16A34A', '#827DBD', '#D97757', '#0891B2', '#CA8A04', '#C46686'])
  expect(palette('dracula')).toEqual(['#BD93F9', '#50FA7B', '#FF5555', '#FFB86C', '#8BE9FD', '#F1FA8C', '#FF79C6'])
})

test('colors the line in Material Theme’s dark palette, the same in Oceanic, Darker, Palenight and Deep Ocean', async () => {
  expect(palette('material')).toEqual(['#82AAFF', '#C3E88D', '#C792EA', '#F78C6C', '#89DDFF', '#FFCB6B', '#F07178'])
})

test('leaves the line uncolored with no theme', async () => {
  expect(colorOf(choices('none'), 'branch', 'git')).toBeNull()
})

test('takes a custom color per item, the default theme’s where none is set', async () => {
  const custom = choices('custom', { branch: '#FF0000' })
  expect([colorOf(custom, 'branch', 'git'), colorOf(custom, 'repo', 'git'), colorOf(custom, 'pr', 'pr')]).toEqual(['#FF0000', '#16A34A', '#827DBD'])
})

test('moves the theme on through every choice, back to none after custom', async () => {
  expect(THEME_CHOICES[0]).toBe('none')
  expect(nextTheme('none')).toBe('default')
  expect(nextTheme('tokyo-night')).toBe('material')
  expect(nextTheme('material')).toBe('custom')
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
