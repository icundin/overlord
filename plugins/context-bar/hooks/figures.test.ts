import { expect, test } from 'claude-code/testing'

import { BREAKDOWN } from './fixtures'
import { alerts, byServer, bySource, cacheHit, turnsUntil } from './figures'

test('lists the thresholds the figures stand past, and treats 0 as off', async () => {
  const thresholds = { context: 80, limit: 90, cost: 50 }
  const limit = { kind: 'five_hour', percentUsed: 92 }
  expect(alerts({ contextPercent: 82, limits: [limit], cost: 51.2 }, thresholds)).toEqual([
    'Session cost $51.20, past your $50',
    'Context at 82%: consider /compact',
    'Session limit at 92%',
  ])
  expect(alerts({ contextPercent: 30, limits: [{ kind: 'five_hour', percentUsed: 10 }], cost: 12 }, thresholds)).toEqual([])
  expect(alerts({ contextPercent: 99, limits: [limit], cost: 999 }, { context: 0, limit: 0, cost: 0 })).toEqual([])
})

test('projects the turns left at the recent pace, leaving compactions out', async () => {
  expect(turnsUntil(160_000, 100_000, [10_000, 20_000, -80_000, 30_000])).toBe(3)
  expect(turnsUntil(160_000, 170_000, [10_000])).toBeNull()
  expect(turnsUntil(160_000, 100_000, [-5_000])).toBeNull()
})

test('groups skills by where they come from, named as /context names them', async () => {
  expect(
    bySource([
      { name: 'docx', source: 'syncedskills', tokens: 320 },
      { name: 'pdf', source: 'syncedSkills', tokens: 150 },
      { name: 'dataviz', source: 'built-in', tokens: 480 },
      { name: 'superpowers:tdd', source: 'plugin', pluginName: 'superpowers', tokens: 40 },
    ]),
  ).toEqual([
    { source: 'built-in', skills: 1, tokens: 480 },
    { source: 'claude.ai sync', skills: 2, tokens: 470 },
    { source: 'superpowers', skills: 1, tokens: 40 },
  ])
})

test('groups MCP tools by server', async () => {
  expect(byServer(BREAKDOWN.mcpTools)).toEqual([{ server: 'docs', tools: 2, tokens: 1400 }])
})

test('works out the cache hit rate', async () => {
  expect(cacheHit({ input: 28, output: 7600, cacheRead: 1_100_000, cacheWrite: 43_500 })).toBe(96)
  expect(cacheHit({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })).toBeNull()
})
