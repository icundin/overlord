import { expect, test } from 'claude-code/testing'

import { ago, compact, duration, limitLabel, modelAlias, modelChoices, modelLabel, resetsIn, share, signed } from './format'

test('shortens the model id to family and version', async () => {
  const ids = {
    'claude-fable-5-1': 'Fable 5.1',
    'claude-opus-5-5': 'Opus 5.5',
    'claude-sonnet-5-5': 'Sonnet 5.5',
    'claude-haiku-5-5': 'Haiku 5.5',
    'claude-opus-5-5[1m]': 'Opus 5.5',
    'claude-haiku-5-5-20261001': 'Haiku 5.5',
    'claude-sonnet-5': 'Sonnet 5',
  }
  for (const [id, label] of Object.entries(ids)) {
    expect(modelLabel(id)).toBe(label)
  }
  expect(modelLabel('us.anthropic.custom')).toBe('us.anthropic.custom')
})

test('names the /model alias the session runs on', async () => {
  expect(modelAlias('claude-opus-5-5', 1_000_000)).toBe('opus[1m]')
  expect(modelAlias('claude-haiku-5-5', 200_000)).toBe('haiku')
  expect(modelAlias('us.anthropic.custom', 200_000)).toBeNull()
})

test('names the limits and counts down to their reset', async () => {
  expect([limitLabel('five_hour'), limitLabel('seven_day'), limitLabel('new_window')]).toEqual([
    'session',
    'weekly · all models',
    'new window',
  ])
  const now = Date.parse('2026-10-13T09:05:00.000Z')
  expect(resetsIn('2026-10-13T11:30:00.000Z', now)).toBe('2 hr 25 min')
  expect(resetsIn('2026-10-13T09:30:00.000Z', now)).toBe('25 min')
  expect(resetsIn('2026-10-16T13:05:00.000Z', now)).toBe('3 d 4 hr')
})

test('says how long ago the limits were read', async () => {
  const now = Date.parse('2026-10-13T09:05:00.000Z')
  expect(ago(now - 59_000, now)).toBe('just now')
  expect(ago(now - 14 * 60_000 - 59_000, now)).toBe('14 min ago')
  expect(ago(now - 125 * 60_000, now)).toBe('2 hr 5 min ago')
  expect(ago(now - (3 * 24 + 4) * 3_600_000, now)).toBe('3 d 4 hr ago')
})

test('keeps only real models among the /model choices', async () => {
  expect(modelChoices(['default', 'sonnet', 'best', 'opus[1m]', 'opusplan'])).toEqual(['sonnet', 'opus[1m]'])
})

test('signs the growth of a turn', async () => {
  expect([signed(12_300), signed(-200_000), signed(840)]).toEqual(['+12k', '−200k', '+840'])
})

test('formats figures as the band shows them', async () => {
  expect([compact(3400), compact(12000), compact(212000), compact(1_000_000)]).toEqual(['3.4k', '12k', '212k', '1M'])
  expect([share(3400, 1_000_000), share(12000, 1_000_000), share(186000, 1_000_000)]).toEqual(['0.3%', '1%', '19%'])
})

test('formats durations', async () => {
  expect([duration(45_000), duration(127_000), duration(3_900_000)]).toEqual(['45s', '2m 7s', '1h 5m'])
})
