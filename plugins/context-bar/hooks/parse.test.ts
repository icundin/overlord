import { expect, test } from 'claude-code/testing'

import { parseAmount, parseColor, parsePercent } from './parse'

test('reads typed percentages and colors', async () => {
  expect([parsePercent('65'), parsePercent(' 0 '), parsePercent('85%'), parsePercent('101'), parsePercent('7.5'), parsePercent('lots')]).toEqual([
    65, 0, 85, null, null, null,
  ])
  expect([parseColor('#ff6188'), parseColor('ff6188'), parseColor('#F68'), parseColor('#ff618'), parseColor('teal'), parseColor('#ff6188aa')]).toEqual([
    '#FF6188',
    '#FF6188',
    '#FF6688',
    null,
    null,
    null,
  ])
})

test('reads typed amounts', async () => {
  expect([parseAmount('50'), parseAmount('$12.50'), parseAmount(' 0 '), parseAmount('12.505'), parseAmount('-5'), parseAmount('lots')]).toEqual([
    50, 12.5, 0, null, null, null,
  ])
})
