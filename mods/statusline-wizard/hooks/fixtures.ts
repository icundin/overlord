import type { On } from 'claude-code'
import { mock } from 'claude-code/testing'

// What the tests stand in for the engine with: a home folder with its files, the commands the mod runs, the session's
// figures, and a record of what the mod set, wrote and said.

export const HOME = '/Users/me'
export const SETTINGS = `${HOME}/.claude/settings.json`

export const STATUS = '# branch.oid 70c9af3e\n# branch.head main\n# branch.upstream origin/main\n# branch.ab +2 -0\n? notes.txt\n'

export type World = {
  env?: Record<string, string>
  files?: Record<string, string>
  stored?: Record<string, unknown>
  // What each command prints, by its first two words; a command not listed fails.
  commands?: Record<string, string>
  // The context used as Claude Code reports it (null before its first response), and as estimated locally.
  context?: { percent: number | null; estimate: number }
  // The settings as merged over every source.
  settings?: Record<string, unknown>
  // Whether reading the session's figures fails.
  isUsageFailing?: boolean
}

// The kit resolves a path that is not absolute here against the working folder, a Windows one among them; the files
// are kept by the path the mod named.
const named = (path: string) => path.replace(/^.*\/(?=[A-Z]:\\)/, '')

export const surround = (on: On, world: World = {}) => {
  const files = new Map(Object.entries(world.files ?? {}))
  const commands = { hostname: 'mac.local\n', 'git --no-optional-locks': STATUS, ...world.commands }
  const lines: (string | undefined)[] = []
  const toasts: string[] = []
  const opened: string[] = []
  const ran: string[][] = []

  const clock = mock.clock(on, { now: Date.parse('2026-10-19T09:00:00.000Z') })
  const store = new Map(Object.entries(world.stored ?? {}))
  on('store.get', (_, e) => ({ value: store.get(e.key) }))
  on('store.set', (_, e) => {
    store.set(e.key, e.value)

    return { value: undefined }
  })
  on('store.delete', (_, e) => {
    store.delete(e.key)

    return { value: undefined }
  })
  mock.env(on, { HOME, USER: 'me', ...world.env })
  on('env.set', (_, e) => {
    if (e.name === 'STATUSLINE_WIZARD_LINE') {
      lines.push(e.value)
    }

    return { value: {} }
  })
  on('fs.exists', (_, e) => ({ value: files.has(named(e.path)) }))
  on('fs.read', (_, e) => {
    const text = files.get(named(e.path))
    if (text === undefined) {
      throw new Error(`ENOENT: ${e.path}`)
    }

    return { value: text }
  })
  on('fs.write', (_, e) => {
    files.set(named(e.path), e.text)

    return { value: undefined }
  })
  on('process.run', (_, e) => {
    ran.push([...e.argv])
    const output = commands[e.argv.slice(0, 2).join(' ') as keyof typeof commands] ?? commands[e.argv[0] as keyof typeof commands]

    return { value: { exitCode: output === undefined ? 1 : 0, stdout: output ?? '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('session.cwd', () => ({ value: `${HOME}/Code/overlord` }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.repo', () => ({ value: { root: `${HOME}/Code/overlord`, remote: 'git@github.com:icundin/overlord.git', internal: false, name: null } }))
  on('settings.read', () => ({ value: world.settings ?? {} }))
  // Read at each call, so a test can move the figures on; the local estimate counts 8k tokens.
  on('session.usage', (_, e) => {
    if (world.isUsageFailing) {
      throw new Error('usage unavailable')
    }
    const { percent, estimate } = world.context ?? { percent: 5, estimate: 5 }

    return {
      value: {
        startedAt: 0,
        context: {
          window: 200000,
          ...(percent === null ? {} : { tokens: 10000, percent }),
          // Only the fields the mod reads; the rest of the breakdown is the engine's.
          ...(e?.breakdown ? { breakdown: { percentage: estimate, totalTokens: 8000 } as never } : {}),
        },
        rateLimits: [{ kind: 'five_hour', percentUsed: 12, resetsAt: '2026-10-19T12:00:00.000Z' }],
        cost: { usd: 0.17 },
      },
    }
  })
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.open', (_, e) => {
    opened.push(e.id)

    return { value: { isPlaced: true as const } }
  })
  on('ui.close', (_, e) => {
    opened.splice(opened.indexOf(e.id), 1)

    return { value: undefined }
  })
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return { clock, files, store, lines, toasts, opened, ran }
}

// A command as the person types it at the prompt.
export const typed = (command: string, args = '') => ({
  command,
  args,
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: true, columns: 120 },
})

export const PANE = {
  component: 'Pane',
  requestId: 'statusline-wizard',
  props: { title: 'Status line', isFocused: true, bodyColumns: 100, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} },
} as const

export const START = { cwd: `${HOME}/Code/overlord`, surface: 'terminal', isInteractive: true } as const
