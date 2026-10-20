import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Choices, Facts, ItemKey, Pending, Section } from '../types'
import { cycledWindow, FIRST_DRAFT, parseInterval, readChoices, toggled } from './choices'
import { parsePullRequest, parseStatus, repoName } from './git'
import { clockText, line } from './line'
import { entryFor, isOurs, statusLineOf, withStatusLine } from './settings'
import type { Shell } from './settings'
import { nextTheme, parseColor } from './themes'
import { pane } from './view/pane'

const PANE = 'statusline-wizard'

const EMPTY: Facts = {
  user: null,
  host: null,
  home: null,
  cwd: null,
  git: null,
  repo: null,
  pr: null,
  model: null,
  effort: null,
  context: null,
  tokens: null,
  limits: [],
  cost: null,
  now: null,
  time: null,
}

const facts = atom({ plugin: 'statusline-wizard', key: 'facts' } as const, EMPTY)
const draft = atom({ plugin: 'statusline-wizard', key: 'draft' } as const, null)
const pending = atom({ plugin: 'statusline-wizard', key: 'pending' } as const, null)
const isInstalled = atom({ plugin: 'statusline-wizard', key: 'isInstalled' } as const, false)
const saved = atom({ plugin: 'statusline-wizard', key: 'saved' } as const, null)
const opened = atom({ plugin: 'statusline-wizard', key: 'opened' } as const, {})
const fieldRevision = atom({ plugin: 'statusline-wizard', key: 'fieldRevision' } as const, 0)
const isSetUp = atom({ plugin: 'statusline-wizard', key: 'isSetUp' } as const, false)

const TICK_MS = 5000
const PR_MS = 60_000
const CONFIRM_MS = 5000
const GIT_ITEMS: ItemKey[] = ['branch', 'ahead', 'behind', 'dirty', 'counts']

let ticking: Timer | null = null
let prReadAt = -Infinity
let shownLine: string | null = null
let isEffortReported = false
let confirmExpiry: Timer | null = null

// The choices as $.store keeps them, or null when none were saved or they no longer read as choices.
async function savedChoices($: EngineInterface): Promise<Choices | null> {
  return readChoices(await $.store.get('choices'))
}

// The pane's choices. They live in the session's state, which a reload keeps: those drafted by an older version are
// read as stored ones are, so a field it did not have comes in with its default.
async function readDraft($: EngineInterface): Promise<Choices | null> {
  return readChoices(await read($, draft))
}

// Every item the saved line shows.
async function wanted($: EngineInterface): Promise<Set<ItemKey>> {
  return new Set((await savedChoices($))?.items ?? [])
}

async function home($: EngineInterface): Promise<string | null> {
  return (await $.env.get('HOME')) || (await $.env.get('USERPROFILE')) || null
}

// Who and where: read once a session, as neither changes under it.
async function readIdentity($: EngineInterface): Promise<void> {
  const user = (await $.env.get('USER')) || (await $.env.get('USERNAME')) || null
  const named = await $.process.run(['hostname']).catch(() => null)
  const host = (named?.exitCode === 0 && named.stdout.trim().split('.')[0]) || null
  const homeDir = await home($)
  const repo = await $.session.repo().catch(() => null)
  await update($, facts, was => ({ ...was, user, host, home: homeDir, repo: repoName(repo?.remote ?? null) }))
}

// The figures as the status line has them. Before Claude Code's first response there is no context reading, so the
// local estimate stands in, as context-bar shows it; it sends no request.
async function readUsage($: EngineInterface): Promise<void> {
  const { context, rateLimits, cost } = await $.session.usage()
  const model = await $.session.model()
  const estimate = context.percent === undefined ? (await $.session.usage({ breakdown: 'summary' })).context.breakdown : undefined
  const percent = context.percent ?? estimate?.percentage ?? null
  const used = context.tokens ?? estimate?.totalTokens ?? null
  await update($, facts, was => ({
    ...was,
    model,
    context: percent === null ? null : Math.round(percent),
    tokens: used === null ? null : { used, window: context.window },
    limits: rateLimits.map(({ kind, percentUsed, resetsAt }) => ({ kind, percentUsed, resetsAt: resetsAt ?? null })),
    cost: cost?.usd ?? null,
  }))
}

// The effort saved with /effort, until a request says which one the session runs on: Claude Code tells mods the
// effort only as it sends one.
async function readSavedEffort($: EngineInterface): Promise<void> {
  if (isEffortReported) {
    return
  }
  const { effortLevel } = await $.settings.read()
  await update($, facts, was => ({ ...was, effort: typeof effortLevel === 'string' ? effortLevel : was.effort }))
}

async function readGit($: EngineInterface, items: Set<ItemKey>): Promise<void> {
  const cwd = await $.session.cwd()
  const isAsked = GIT_ITEMS.some(key => items.has(key))
  // Without optional locks, so a read every few seconds never holds the index lock against the person's own git.
  const argv = ['git', '--no-optional-locks', 'status', '--porcelain=v2', '--branch']
  const ran = isAsked ? await $.process.run(argv, { cwd }).catch(() => null) : null
  const git = ran?.exitCode === 0 ? parseStatus(ran.stdout) : null
  await update($, facts, was => ({ ...was, cwd, git }))
}

// The branch's pull request, asked of `gh` at most once a minute and only while its item is on.
async function readPullRequest($: EngineInterface, items: Set<ItemKey>, isForced = false): Promise<void> {
  if (!items.has('pr')) {
    return
  }
  const now = await $.clock.now()
  if (!isForced && now - prReadAt < PR_MS) {
    return
  }
  prReadAt = now
  const argv = ['gh', 'pr', 'view', '--json', 'number,state,isDraft,reviewDecision']
  const ran = await $.process.run(argv, { cwd: await $.session.cwd() }).catch(() => null)
  const pr = ran?.exitCode === 0 ? parsePullRequest(ran.stdout) : null
  await update($, facts, was => ({ ...was, pr }))
}

// Hands the saved line to the command through the env var it prints; each run after inherits the newest.
async function publish($: EngineInterface): Promise<void> {
  const choices = await savedChoices($)
  if (choices === null) {
    return
  }
  const text = line(choices, await read($, facts))
  if (text !== shownLine) {
    shownLine = text
    await $.env.set('STATUSLINE_WIZARD_LINE', text)
  }
}

// The time, for the clock and the plan windows' countdown.
async function readTime($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  await update($, facts, was => ({ ...was, now, time: clockText(new Date(now)) }))
}

// Re-reads what changes outside the session's own events (the time, the working copy, a save made in another
// session) and publishes. A /clear empties the session's state and raises no session.start, so the tick sets it up
// again when it finds it so.
async function tick($: EngineInterface): Promise<void> {
  if (!(await read($, isSetUp))) {
    return setUp($)
  }
  await readTime($).catch(() => undefined)
  const items = await wanted($)
  await readGit($, items).catch(() => undefined)
  await readPullRequest($, items).catch(() => undefined)
  await publish($)
}

// Reads every fact afresh: the session's state, which a reload keeps, may hold facts of an older version's shape.
async function setUp($: EngineInterface): Promise<void> {
  await update($, facts, () => EMPTY)
  await update($, isSetUp, () => true)
  isEffortReported = false
  await readIdentity($).catch(() => undefined)
  await readUsage($).catch(() => undefined)
  await readSavedEffort($).catch(() => undefined)
  await tick($).catch(() => undefined)
  ticking?.cancel()
  ticking = $.clock.every(TICK_MS, () => void tick($).catch(() => undefined))
}

async function configDir($: EngineInterface): Promise<string> {
  return (await $.env.get('CLAUDE_CONFIG_DIR')) || `${(await home($)) ?? '~'}/.claude`
}

async function settingsPath($: EngineInterface): Promise<string> {
  return `${await configDir($)}/settings.json`
}

// The settings file's text, or null where there is none yet.
async function readSettings($: EngineInterface): Promise<string | null> {
  const path = await settingsPath($)

  return (await $.fs.exists(path)) ? $.fs.read(path) : null
}

// Where Claude Code itself finds Git Bash on Windows: CLAUDE_CODE_GIT_BASH_PATH, Git for Windows' own folders, or
// the `bin` beside the git on the PATH.
async function shellOf($: EngineInterface): Promise<Shell> {
  if ((await $.env.get('OS')) !== 'Windows_NT') {
    return 'bash'
  }
  const where = await $.process.run(['where', 'git']).catch(() => null)
  const besideGit = (where?.exitCode === 0 ? where.stdout.split(/\r?\n/).filter(Boolean) : []).map(git =>
    git.replace(/[\\/][^\\/]+[\\/][^\\/]+$/, '\\bin\\bash.exe'),
  )
  const candidates = [
    await $.env.get('CLAUDE_CODE_GIT_BASH_PATH'),
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    ...besideGit,
  ]
  for (const path of candidates) {
    if (path && (await $.fs.exists(path).catch(() => false))) {
      return 'bash'
    }
  }

  return 'powershell'
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

async function close($: EngineInterface): Promise<void> {
  await update($, pending, () => null)
  await update($, draft, () => null)
  await $.ui.close({ id: PANE })
}

// The settings file's text and its `statusLine`, or null after telling the person it could not be read.
async function currentSettings($: EngineInterface): Promise<{ text: string | null; statusLine: unknown } | null> {
  try {
    const text = await readSettings($)

    return { text, statusLine: statusLineOf(text) }
  } catch {
    $.ui.toast(`${await settingsPath($)} could not be read, so nothing was changed.`)

    return null
  }
}

// Keeps the choices for every session and draws the line from them at once, the pull request read afresh.
async function keepChoices($: EngineInterface, choices: Choices): Promise<void> {
  await $.store.set('choices', choices)
  await update($, saved, () => choices)
  const items = new Set(choices.items)
  await readGit($, items).catch(() => undefined)
  await readPullRequest($, items, true).catch(() => undefined)
  await publish($)
}

// Arms a save or a remove for a second press; five seconds without one disarm it, as context-bar's buttons do.
async function arm($: EngineInterface, waiting: Pending): Promise<void> {
  confirmExpiry?.cancel()
  await update($, pending, () => waiting)
  confirmExpiry = $.clock.after(CONFIRM_MS, () => void update($, pending, () => null))
}

// Saves the draft: straight away where the settings entry stays as it is, else on a second press. The pane stays
// open, so the line can be watched as it changes.
async function save($: EngineInterface): Promise<void> {
  if ((await read($, pending))?.action === 'save') {
    return confirm($)
  }
  const choices = await readDraft($)
  const current = choices === null ? null : await currentSettings($)
  if (choices === null || current === null) {
    return
  }
  const after = entryFor(await shellOf($), choices.interval)
  if (same(current.statusLine, after)) {
    await keepChoices($, choices)
    await update($, pending, () => null)
    $.ui.toast('Status line saved')

    return
  }
  await arm($, { action: 'save', after })
}

async function remove($: EngineInterface): Promise<void> {
  if ((await read($, pending))?.action === 'remove') {
    return confirm($)
  }
  const current = await currentSettings($)
  if (current === null) {
    return
  }
  const previous = await $.store.get('previous')
  await arm($, { action: 'remove', after: previous ?? null })
}

// Writes the change the person said yes to, keeping the file as it was beside it.
async function confirm($: EngineInterface): Promise<void> {
  const waiting = await read($, pending)
  const current = waiting === null ? null : await currentSettings($)
  if (waiting === null || current === null) {
    return
  }
  const path = await settingsPath($)
  const after = waiting.after === null ? undefined : waiting.after
  try {
    const text = withStatusLine(current.text, after)
    if (current.text !== null) {
      await $.fs.write(`${path}.statusline-wizard.bak`, current.text)
    }
    await $.fs.write(path, text)
  } catch (error) {
    $.ui.toast(`${path} could not be written: ${error instanceof Error ? error.message : String(error)}`)

    return
  }
  if (waiting.action === 'save') {
    // The entry it replaces is kept once, so a second save never takes the wizard's own for the one to restore.
    if (!isOurs(current.statusLine)) {
      await $.store.set('previous', current.statusLine ?? null)
    }
    const choices = await readDraft($)
    if (choices !== null) {
      await keepChoices($, choices)
    }
  } else {
    await $.store.delete('previous')
  }
  await update($, isInstalled, () => waiting.action === 'save')
  await update($, pending, () => null)
  $.ui.toast(waiting.action === 'save' ? 'Status line saved' : 'Status line removed')
}

async function open($: EngineInterface): Promise<void> {
  const kept = await savedChoices($)
  const choices = kept ?? FIRST_DRAFT
  await update($, saved, () => kept)
  await update($, draft, () => choices)
  await update($, pending, () => null)
  const current = await currentSettings($)
  await update($, isInstalled, () => isOurs(current?.statusLine))
  await $.ui.open({ id: PANE, title: 'Status line', focus: true, closeOnEscape: true })
}

// Any change disarms a waiting save or remove, so the change it showed is never stale.
async function changeDraft($: EngineInterface, change: (was: Choices) => Choices): Promise<void> {
  await update($, pending, () => null)
  await update($, draft, was => (was === null ? null : change(readChoices(was) ?? FIRST_DRAFT)))
}

// A custom color as typed: a hex color sets it, an empty field goes back to the default theme's, anything else is
// said and kept out.
async function setColor($: EngineInterface, key: ItemKey, text: string): Promise<void> {
  const color = parseColor(text)
  await update($, fieldRevision, was => was + 1)
  if (color === null && text.trim() !== '') {
    $.ui.toast('Type a hex color, like #FF6188 or #F68; an empty field goes back to the default.')

    return
  }
  await changeDraft($, was => {
    const { [key]: _, ...rest } = was.colors

    return { ...was, colors: color === null ? rest : { ...rest, [key]: color } }
  })
}

// The refresh interval as typed: whole seconds, one or more, as Claude Code takes it; anything else is said and kept out.
async function setRefresh($: EngineInterface, text: string): Promise<void> {
  const seconds = parseInterval(text)
  await update($, fieldRevision, was => was + 1)
  if (seconds === null) {
    $.ui.toast('Type a whole number of seconds, 1 or more.')

    return
  }
  await changeDraft($, was => ({ ...was, interval: seconds }))
}

async function toggleSection($: EngineInterface, key: Section): Promise<void> {
  await update($, pending, () => null)
  await update($, opened, was => ({ ...was, [key]: !(was[key] ?? true) }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'statusline-wizard', description: 'Pick what your status line shows' })
    const result = await next(e)
    await setUp($)

    return result
  })

  on('command.run', { command: 'statusline-wizard' }, async $ => {
    await open($)

    return { text: 'Status line pane opened.' }
  })

  // Raised after each main-thread turn and when a plan limit moves a whole point.
  on('session.measure', async ($, e, next) => {
    const result = await next(e)
    await readUsage($).catch(() => undefined)
    await publish($)

    return result
  })

  // The model and effort the main loop's request is sent with; subagents' requests are left out.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) {
      isEffortReported = e.effort !== undefined
      await update($, facts, was => ({ ...was, model: e.model, effort: e.effort === undefined ? null : String(e.effort) }))
      await publish($)
    }

    return yield* next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    const editing = await readDraft($)
    if (editing === null || e.surface !== 'terminal') {
      return next(e)
    }

    return pane(
      $.ui.resolve(e),
      {
        draft: editing,
        pending: await read($, pending),
        isInstalled: await read($, isInstalled),
        isUnsaved: !same(readChoices(await read($, saved)), editing),
        opened: await read($, opened),
        fieldRevision: await read($, fieldRevision),
        width: e.props.bodyColumns,
      },
      {
        toggleItem: key => changeDraft($, was => ({ ...was, items: toggled(was.items, key) })),
        cycleWindow: window => changeDraft($, was => cycledWindow(was, window)),
        toggleIcons: () => changeDraft($, was => ({ ...was, icons: !was.icons })),
        setRefresh: text => setRefresh($, text),
        nextTheme: () => changeDraft($, was => ({ ...was, theme: nextTheme(was.theme) })),
        setColor: (key, text) => setColor($, key, text),
        toggleSection: key => toggleSection($, key),
        save: () => save($),
        remove: () => remove($),
        close: () => close($),
      },
    )
  })
}
