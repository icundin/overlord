import type { Facts } from '../types'

// What the preview draws every item from: one example of each, so an item shows whatever the session holds now.
export const SAMPLE: Facts = {
  user: 'you',
  host: 'host',
  home: '/home/you',
  cwd: '/home/you/Code/project',
  git: { branch: 'main', ahead: 2, behind: 1, isDirty: true, staged: 2, modified: 3, untracked: 1 },
  repo: 'owner/repo',
  pr: { number: 26, review: 'approved' },
  model: 'claude-opus-5-5',
  effort: 'high',
  context: 5,
  tokens: { used: 45_000, window: 1_000_000 },
  limits: [
    { kind: 'five_hour', percentUsed: 12, resetsAt: '2026-10-20T11:13:00.000Z' },
    { kind: 'seven_day', percentUsed: 8, resetsAt: '2026-10-22T04:00:00.000Z' },
  ],
  cost: 0.17,
  now: Date.parse('2026-10-20T09:00:00.000Z'),
  time: '09:41',
}
