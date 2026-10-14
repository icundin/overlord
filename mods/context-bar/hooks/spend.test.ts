import { expect, test } from 'claude-code/testing'

import { costAtEnd, costAtStart, MAIN, spendGroups, startSpend } from './spend'

const main = { id: MAIN, label: 'main' }
// Dollar sums carry floating-point dust; compared to a hundredth of a cent.
const round = (usd: number) => Math.round(usd * 10_000) / 10_000
const hooks = { id: 'a1', label: 'list hooks files' }

test('gives a request the growth seen as it ends, and growth seen as one starts to Claude Code', async () => {
  let spend = startSpend(0.5)
  spend = costAtStart(spend, 0.5)
  spend = costAtEnd(spend, 0.66, main, 46_000)
  spend = costAtStart(spend, 0.7)
  spend = costAtEnd(spend, 0.75, hooks, 14_000)
  expect(spend.earlier).toBe(0.5)
  expect(round(spend.other)).toBe(0.04)
  expect(spend.agents.map(one => ({ ...one, usd: round(one.usd) }))).toEqual([
    { ...main, usd: 0.16, tokens: 46_000, models: [] },
    { ...hooks, usd: 0.05, tokens: 14_000, models: [] },
  ])
})

test('counts from the first reading when nothing was set up', async () => {
  expect(costAtStart(null, 0.3)).toEqual({ earlier: 0.3, other: 0, read: 0.3, agents: [] })
})

test('gives the cost of a request no agent names to Claude Code', async () => {
  const spend = costAtEnd(startSpend(0), 0.02, null, 900)
  expect(spend.other).toBe(0.02)
  expect(spend.agents).toEqual([])
})

// Two requests overlap: the one whose reading lands later in the state takes nothing below the last reading.
test('never counts a cent twice when overlapping requests read the total out of order', async () => {
  let spend = startSpend(0.1)
  spend = costAtEnd(spend, 0.3, hooks, 100)
  spend = costAtEnd(spend, 0.25, main, 100)
  const counted = spend.earlier + spend.other + spend.agents.reduce((sum, one) => sum + one.usd, 0)
  expect(round(counted)).toBe(0.3)
  expect(spend.read).toBe(0.3)
})

test('lists main first, then the rest by cost, Claude Code among them, and the earlier cost last', async () => {
  let spend = startSpend(0.2)
  spend = costAtEnd(spend, 0.6, main, 1)
  spend = costAtEnd(spend, 0.65, hooks, 1)
  spend = costAtEnd(spend, 0.85, { id: 'a2', label: 'list skills' }, 1)
  spend = costAtStart(spend, 1)
  const groups = spendGroups(spend)
  expect(groups.map(group => [group.label, round(group.usd)])).toEqual([
    ['main', 0.4],
    ['list skills', 0.2],
    ['claude code', 0.15],
    ['list hooks files', 0.05],
    ['earlier', 0.2],
  ])
  // A subagent keeps its color as others overtake it.
  expect(groups.find(group => group.label === 'list hooks files')?.color).not.toBe(groups.find(group => group.label === 'list skills')?.color)
})

test('merges the runs of one task into a row that counts them', async () => {
  let spend = startSpend(0)
  spend = costAtEnd(spend, 0.06, hooks, 30_000)
  spend = costAtEnd(spend, 0.09, { id: 'a2', label: hooks.label }, 30_000)
  expect(spendGroups(spend).map(group => [group.label, round(group.usd), group.tokens])).toEqual([['list hooks files ×2', 0.09, 60_000]])
})

test('shows main and the four costliest rows, the rest in one', async () => {
  let spend = startSpend(0)
  spend = costAtEnd(spend, 1, main, 1)
  for (const [i, usd] of [0.6, 0.5, 0.4, 0.3, 0.2, 0.1].entries()) {
    spend = costAtEnd(spend, spend.read + usd, { id: `a${i}`, label: `task ${i}` }, 10)
  }
  expect(spendGroups(spend).map(group => [group.label, round(group.usd), group.tokens])).toEqual([
    ['main', 1, 1],
    ['task 0', 0.6, 10],
    ['task 1', 0.5, 10],
    ['task 2', 0.4, 10],
    ['task 3', 0.3, 10],
    ['2 more', 0.3, 20],
  ])
})

// The folded rows may run on every model; each names its own once opened.
test('names no model on the row the cheapest fold into', async () => {
  let spend = startSpend(0)
  for (const [i, usd] of [0.6, 0.5, 0.4, 0.3, 0.2, 0.1].entries()) {
    spend = costAtEnd(spend, spend.read + usd, { id: `a${i}`, label: `task ${i}` }, 10, i === 4 ? 'claude-haiku-5-5' : 'claude-fable-5-1')
  }
  const more = spendGroups(spend).at(-1)
  expect(more?.models).toEqual([])
  expect(more?.folded?.map(one => one.models)).toEqual([['claude-haiku-5-5'], ['claude-fable-5-1']])
})

test('leaves out what cost nothing, main aside', async () => {
  expect(spendGroups(costAtEnd(startSpend(0), 0, main, 10)).map(group => group.label)).toEqual(['main'])
})

test('names the models each agent ran on, a task merging only with runs on the same ones', async () => {
  let spend = startSpend(0)
  spend = costAtEnd(spend, 0.1, main, 1, 'claude-opus-5-5')
  spend = costAtEnd(spend, 0.2, hooks, 1, 'claude-opus-5-5')
  spend = costAtEnd(spend, 0.3, { id: 'a2', label: hooks.label }, 1, 'claude-opus-5-5')
  spend = costAtEnd(spend, 0.32, { id: 'a3', label: hooks.label }, 1, 'claude-haiku-5-5')
  // A fallback mid-run: one agent, two models.
  spend = costAtEnd(spend, 0.4, { id: 'a4', label: 'review' }, 1, 'claude-opus-5-5')
  spend = costAtEnd(spend, 0.41, { id: 'a4', label: 'review' }, 1, 'claude-haiku-5-5')
  expect(spendGroups(spend).map(group => [group.label, group.models])).toEqual([
    ['main', ['claude-opus-5-5']],
    ['list hooks files ×2', ['claude-opus-5-5']],
    ['review', ['claude-opus-5-5', 'claude-haiku-5-5']],
    ['list hooks files', ['claude-haiku-5-5']],
  ])
})
