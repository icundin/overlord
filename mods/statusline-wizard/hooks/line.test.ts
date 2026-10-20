import { expect, test } from 'claude-code/testing'

import type { Facts } from '../types'
import { dollars, line, modelLabel, shortPath } from './line'

const FACTS: Facts = {
  user: 'inigo',
  host: 'mac',
  home: '/Users/inigo',
  cwd: '/Users/inigo/Code/overlord',
  git: { branch: 'main', ahead: 2, isDirty: true },
  repo: 'icundin/overlord',
  pr: { number: 26, review: 'approved' },
  model: 'claude-opus-5-5',
  effort: 'high',
  context: 5,
  limits: [
    { kind: 'five_hour', percentUsed: 12 },
    { kind: 'seven_day', percentUsed: 8 },
  ],
  cost: 0.1673,
}

const ALL = ['user', 'folder', 'branch', 'ahead', 'dirty', 'repo', 'pr', 'model', 'effort', 'context', 'limits', 'cost'] as const

test('draws every item in its order, without icons', async () => {
  expect(line({ items: [...ALL], icons: false, interval: 2 }, FACTS)).toBe(
    'inigo@mac  ~/Code/overlord  main ↑2 ●  icundin/overlord  PR #26 approved  Opus 5.5  high  ctx 5%  5h 12% · 7d 8%  $0.17',
  )
})

test('draws every item with its icon', async () => {
  expect(line({ items: [...ALL], icons: true, interval: 2 }, FACTS)).toBe(
    '👤 inigo@mac  📁 ~/Code/overlord  🌿 main ↑2 ●  📦 icundin/overlord  🔀 PR #26 approved  🤖 Opus 5.5  🧠 high  📊 5%  ⏳ 5h 12% · 7d 8%  💰 $0.17',
  )
})

test('keeps the order of the items, not of the choice', async () => {
  expect(line({ items: ['cost', 'model'], icons: false, interval: 2 }, FACTS)).toBe('Opus 5.5  $0.17')
})

test('leaves out what the session has no reading of', async () => {
  const bare: Facts = { ...FACTS, git: null, repo: null, pr: null, effort: null, context: null, limits: [], cost: null }
  expect(line({ items: [...ALL], icons: false, interval: 2 }, bare)).toBe('inigo@mac  ~/Code/overlord  Opus 5.5')
})

test('shows the unpushed commits and changes only when there are some', async () => {
  const clean: Facts = { ...FACTS, git: { branch: 'main', ahead: 0, isDirty: false } }
  expect(line({ items: ['branch', 'ahead', 'dirty'], icons: false, interval: 2 }, clean)).toBe('main')
  expect(line({ items: ['ahead', 'dirty', 'model'], icons: false, interval: 2 }, FACTS)).toBe('↑2 ●  Opus 5.5')
})

test('names a pull request without a review state by its number', async () => {
  expect(line({ items: ['pr'], icons: false, interval: 2 }, { ...FACTS, pr: { number: 7, review: null } })).toBe('PR #7')
})

test('names a gateway spend limit', async () => {
  const facts: Facts = { ...FACTS, limits: [{ kind: 'spend_limit', percentUsed: 40.4 }] }
  expect(line({ items: ['limits'], icons: false, interval: 2 }, facts)).toBe('spend 40%')
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
