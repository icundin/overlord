import { expect, test } from 'claude-code/testing'

import type { Choices, Facts, ItemKey, Window } from '../types'
import { clockText, compact, countdown, dollars, line, modelLabel, shortPath } from './line'

const NOW = Date.parse('2026-10-20T09:00:00.000Z')

const FACTS: Facts = {
  user: 'inigo',
  host: 'mac',
  home: '/Users/inigo',
  cwd: '/Users/inigo/Code/overlord',
  git: { branch: 'main', ahead: 2, behind: 1, isDirty: true, staged: 2, modified: 3, untracked: 1 },
  repo: 'icundin/overlord',
  pr: { number: 26, review: 'approved' },
  model: 'claude-opus-5-5',
  effort: 'high',
  context: 5,
  tokens: { used: 45_000, window: 1_000_000 },
  limits: [
    { kind: 'five_hour', percentUsed: 12, resetsAt: '2026-10-20T11:13:00.000Z' },
    { kind: 'seven_day', percentUsed: 8, resetsAt: '2026-10-22T04:00:00.000Z' },
  ],
  cost: 0.1673,
  now: NOW,
  time: '09:41',
}

const ALL: ItemKey[] = [
  'clock',
  'user',
  'folder',
  'repo',
  'branch',
  'ahead',
  'behind',
  'dirty',
  'counts',
  'pr',
  'model',
  'effort',
  'context',
  'tokens',
  'session',
  'weekly',
  'spend',
  'cost',
]

const with_ = (items: ItemKey[], icons = false, resets: Window[] = ['session', 'weekly']): Choices => ({
  items,
  resets,
  icons,
  interval: 2,
  theme: 'none',
  colors: {},
})

const ESC = '\u001b'

test('draws every item in its order, without icons', async () => {
  expect(line(with_(ALL), FACTS)).toBe(
    '09:41  inigo@mac  ~/Code/overlord  icundin/overlord  main ↑2 ↓1 ● +2 ~3 ?1  PR #26 approved  Opus 5.5 (high)  ctx 5% · 45k / 1M  ' +
      '5h 12% (2h 13m) · 7d 8% (1d 19h)  $0.17',
  )
})

test('draws every item with its icon, an item joined to the one before it without one', async () => {
  expect(line(with_(ALL, true), FACTS)).toBe(
    '🕐 09:41  👤 inigo@mac  📁 ~/Code/overlord  📦 icundin/overlord  🌿 main ↑2 ↓1 ● +2 ~3 ?1  🔀 PR #26 approved  🤖 Opus 5.5 (high)  ' +
      '📊 5% · 45k / 1M  ⏳ 5h 12% (2h 13m) · 7d 8% (1d 19h)  💰 $0.17',
  )
})

test('colors each item in its theme color, its icon and joiner with it, the space between items left plain', async () => {
  const themed: Choices = { ...with_(['folder', 'branch', 'ahead', 'model', 'effort'], true), theme: 'default' }
  const blue = `${ESC}[38;2;106;155;204m`
  const green = `${ESC}[38;2;22;163;74m`
  const orange = `${ESC}[38;2;217;119;87m`
  expect(line(themed, FACTS)).toBe(
    `${blue}📁 ~/Code/overlord${ESC}[39m  ${green}🌿 main${ESC}[39m${green} ↑2${ESC}[39m  ${orange}🤖 Opus 5.5${ESC}[39m${orange} (high)${ESC}[39m`,
  )
})

test('colors each kind of item its own color of the theme', async () => {
  const themed: Choices = { ...with_(['branch', 'pr', 'context', 'session', 'cost'], false, []), theme: 'material' }
  const hex = (color: string) => `${ESC}[38;2;${[1, 3, 5].map(at => parseInt(color.slice(at, at + 2), 16)).join(';')}m`
  expect(line(themed, FACTS)).toBe(
    `${hex('#C3E88D')}main${ESC}[39m  ${hex('#C792EA')}PR #26 approved${ESC}[39m  ${hex('#89DDFF')}ctx 5%${ESC}[39m  ` +
      `${hex('#FFCB6B')}5h 12%${ESC}[39m  ${hex('#F07178')}$0.17${ESC}[39m`,
  )
})

test('colors an item its own custom color', async () => {
  const custom: Choices = { ...with_(['branch', 'ahead']), theme: 'custom', colors: { ahead: '#FF0000' } }
  expect(line(custom, FACTS)).toBe(`${ESC}[38;2;22;163;74mmain${ESC}[39m${ESC}[38;2;255;0;0m ↑2${ESC}[39m`)
})

test('keeps the order of the items, not of the choice', async () => {
  expect(line(with_(['cost', 'model']), FACTS)).toBe('Opus 5.5  $0.17')
})

test('leaves out what the session has no reading of', async () => {
  const bare: Facts = { ...FACTS, git: null, repo: null, pr: null, effort: null, context: null, tokens: null, limits: [], cost: null, time: null }
  expect(line(with_(ALL), bare)).toBe('inigo@mac  ~/Code/overlord  Opus 5.5')
})

test('shows the commits and files only when there are some, the counts only those not zero', async () => {
  const clean: Facts = { ...FACTS, git: { branch: 'main', ahead: 0, behind: 0, isDirty: false, staged: 0, modified: 0, untracked: 0 } }
  expect(line(with_(['branch', 'ahead', 'behind', 'dirty', 'counts']), clean)).toBe('main')
  const some: Facts = { ...FACTS, git: { branch: 'main', ahead: 0, behind: 0, isDirty: true, staged: 0, modified: 4, untracked: 0 } }
  expect(line(with_(['branch', 'counts']), some)).toBe('main ~4')
  expect(line(with_(['ahead', 'dirty', 'model']), FACTS)).toBe('↑2 ●  Opus 5.5')
})

test('draws an item joined to another on its own, with its own icon, when that one is off', async () => {
  expect(line(with_(['tokens'], true), FACTS)).toBe('📊 45k / 1M')
  expect(line(with_(['counts'], true), FACTS)).toBe('🌿 +2 ~3 ?1')
  expect(line(with_(['tokens']), FACTS)).toBe('ctx 45k / 1M')
})

test('shows each plan window on its own, one icon for those shown together', async () => {
  expect(line(with_(['session', 'weekly'], false, []), FACTS)).toBe('5h 12% · 7d 8%')
  expect(line(with_(['weekly'], true, []), FACTS)).toBe('⏳ 7d 8%')
  expect(line(with_(['session', 'weekly'], true, []), { ...FACTS, limits: [FACTS.limits[1]!] })).toBe('⏳ 7d 8%')
})

test('counts down only the windows asked to, and only until they reset', async () => {
  expect(line(with_(['session', 'weekly'], false, ['weekly']), FACTS)).toBe('5h 12% · 7d 8% (1d 19h)')
  const passed: Facts = { ...FACTS, limits: [{ kind: 'five_hour', percentUsed: 12, resetsAt: '2026-10-20T08:00:00.000Z' }] }
  expect(line(with_(['session'], false, ['session']), passed)).toBe('5h 12%')
})

test('shows the model and its effort together, one icon for both, either one alone', async () => {
  expect(line(with_(['model', 'effort'], true), FACTS)).toBe('🤖 Opus 5.5 (high)')
  expect(line(with_(['effort'], true), FACTS)).toBe('🤖 high')
  expect(line(with_(['model', 'effort']), { ...FACTS, effort: null })).toBe('Opus 5.5')
})

test('names a pull request without a review state by its number', async () => {
  expect(line(with_(['pr']), { ...FACTS, pr: { number: 7, review: null } })).toBe('PR #7')
})

test('names a gateway spend limit', async () => {
  expect(line(with_(['spend']), { ...FACTS, limits: [{ kind: 'spend_limit', percentUsed: 40.4, resetsAt: null }] })).toBe('spend 40%')
})

test('says how long until a reset, in its two largest units', async () => {
  expect(countdown('2026-10-20T09:25:00.000Z', NOW)).toBe('25m')
  expect(countdown('2026-10-20T11:13:00.000Z', NOW)).toBe('2h 13m')
  expect(countdown('2026-10-20T11:00:00.000Z', NOW)).toBe('2h')
  expect(countdown('2026-10-22T04:00:00.000Z', NOW)).toBe('1d 19h')
  expect(countdown('2026-10-20T08:00:00.000Z', NOW)).toBeNull()
  expect(countdown(null, NOW)).toBeNull()
})

test('writes token counts short', async () => {
  expect([compact(840), compact(3400), compact(45_000), compact(212_400), compact(1_000_000), compact(1_500_000)]).toEqual([
    '840',
    '3.4k',
    '45k',
    '212k',
    '1M',
    '1.5M',
  ])
})

test('tells the time on the 24-hour clock', async () => {
  expect([clockText(new Date(2026, 9, 20, 9, 41)), clockText(new Date(2026, 9, 20, 23, 5))]).toEqual(['09:41', '23:05'])
})

test('shortens the home folder to ~', async () => {
  expect(shortPath('/Users/inigo/Code', '/Users/inigo')).toBe('~/Code')
  expect(shortPath('/Users/inigo', '/Users/inigo')).toBe('~')
  expect(shortPath('/Users/inigone/Code', '/Users/inigo')).toBe('/Users/inigone/Code')
  expect(shortPath('C:\\Users\\inigo\\Code', 'C:\\Users\\inigo')).toBe('~\\Code')
  expect(shortPath('/srv/app', null)).toBe('/srv/app')
})

test('shortens the model id to family and version', async () => {
  expect([modelLabel('claude-opus-5-5'), modelLabel('claude-haiku-5-5-20261001'), modelLabel('claude-sonnet-5')]).toEqual([
    'Opus 5.5',
    'Haiku 5.5',
    'Sonnet 5',
  ])
  expect(modelLabel('us.anthropic.custom')).toBe('us.anthropic.custom')
})

test('writes a cost under a cent as such, never as free', async () => {
  expect([dollars(0), dollars(0.004), dollars(1.163)]).toEqual(['$0.00', '<$0.01', '$1.16'])
})
