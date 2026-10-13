import type { ContextCategory, On, SessionContextBreakdown } from 'claude-code'
import { mock } from 'claude-code/testing'

// What the tests stand in for the engine with: a context breakdown, the config menu's rows, the band's props, and
// the hooks a session answers.

export const CATEGORIES: ContextCategory[] = [
  { name: 'System prompt', tokens: 3000, color: 'promptBorder', isDeferred: false, kind: 'used' },
  { name: 'Messages', tokens: 47000, color: 'claude', isDeferred: false, kind: 'used' },
  { name: 'MCP tools', tokens: 9000, color: 'ide', isDeferred: true, kind: 'deferred' },
  { name: 'Free space', tokens: 117000, color: 'inactive', isDeferred: false, kind: 'free' },
  { name: 'Autocompact buffer', tokens: 33000, color: 'inactive', isDeferred: false, kind: 'buffer' },
]

export const BREAKDOWN: SessionContextBreakdown = {
  categories: CATEGORIES,
  totalTokens: 50000,
  maxTokens: 200000,
  rawMaxTokens: 200000,
  autocompactSource: 'model-default',
  percentage: 25,
  gridRows: [],
  model: 'claude-opus-5-5',
  memoryFiles: [{ path: '/Users/me/.claude/CLAUDE.md', type: 'User', tokens: 1200 }],
  mcpTools: [
    { name: 'docs_read', serverName: 'docs', tokens: 800, isLoaded: true },
    { name: 'docs_write', serverName: 'docs', tokens: 600, isLoaded: false },
  ],
  agents: [],
  isAutoCompactEnabled: true,
  autoCompactThreshold: 167000,
  apiUsage: null,
}

// The config menu's rows the mod reads: the theme and the /model choices.
export const configRows = (theme: string) =>
  [
    { key: 'theme', label: 'Theme', kind: 'choice', value: theme, options: ['auto', 'dark', 'light'], provider: { name: 'engine' }, isLocked: false },
    {
      key: 'model',
      label: 'Model',
      kind: 'choice',
      value: 'default',
      options: ['default', 'sonnet', 'opus', 'haiku', 'fable', 'best', 'sonnet[1m]', 'opus[1m]', 'fable[1m]', 'opusplan'],
      provider: { name: 'engine' },
      isLocked: false,
    },
  ] as never

export const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 40, scroll: { offset: 0, bodyRows: 9 }, view: {} },
} as const

export const usageWith = (percentage: number, cost: number | null = null) => ({
  value: {
    startedAt: 0,
    rateLimits: [],
    ...(cost === null ? {} : { cost: { usd: cost } }),
    context: { window: 200000, tokens: 50000, percent: percentage, breakdown: { ...BREAKDOWN, percentage } },
  },
})

// `stored` seeds the mod's $.store; null leaves the store to the test's own hooks.
export const surround = (on: On, theme: string, percentage: number, stored: Record<string, unknown> | null = {}, cost: number | null = null) => {
  mock.clock(on, { now: Date.parse('2026-10-13T09:05:00.000Z') })
  if (stored !== null) {
    mock.store(on, stored)
  }
  on('session.usage', () => usageWith(percentage, cost))
  on('config.list', () => ({ value: configRows(theme) }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text key="engine">engine band</Text>
  })
}
