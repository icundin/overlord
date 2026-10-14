import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionRateLimit, Timer } from 'claude-code'

import type { BarSettings, Confirmable, Limit, Panel, Section, Spend, Tally, Tokens, Usage } from '../types'
import { byServer, totalTokens } from './figures'
import { modelChoices } from './format'
import { distinctColors, themed } from './themes'
import { DEFAULT_OPEN, DEFAULT_SETTINGS } from './defaults'
import { costAtEnd, costAtStart, MAIN, startSpend } from './spend'
import { band } from './view/band'

const usage = atom({ plugin: 'context-bar', key: 'usage' } as const, null)
const limitsAt = atom({ plugin: 'context-bar', key: 'limitsAt' } as const, null)
const isHidden = atom({ plugin: 'context-bar', key: 'isHidden' } as const, false)
const effort = atom({ plugin: 'context-bar', key: 'effort' } as const, null)
const panel = atom({ plugin: 'context-bar', key: 'panel' } as const, null)
const fill = atom({ plugin: 'context-bar', key: 'fill' } as const, 1)
const sections = atom({ plugin: 'context-bar', key: 'sections' } as const, {})
const tally = atom({ plugin: 'context-bar', key: 'tally' } as const, null)
const spend = atom({ plugin: 'context-bar', key: 'spend' } as const, null)
const confirming = atom({ plugin: 'context-bar', key: 'confirming' } as const, null)
const isLight = atom({ plugin: 'context-bar', key: 'isLight' } as const, false)
const models = atom({ plugin: 'context-bar', key: 'models' } as const, [])
const growth = atom({ plugin: 'context-bar', key: 'growth' } as const, {
  startTokens: null,
  startCost: null,
  lastDelta: null,
  lastCost: null,
  deltas: [],
})
const runningAgents = atom({ plugin: 'context-bar', key: 'runningAgents' } as const, 0)
const isInitialized = atom({ plugin: 'context-bar', key: 'isInitialized' } as const, false)
const settings = atom({ plugin: 'context-bar', key: 'settings' } as const, DEFAULT_SETTINGS)
const fieldRevision = atom({ plugin: 'context-bar', key: 'fieldRevision' } as const, 0)

const FRAME_MS = 30
const FILL_MS = 300

// The settings as $.store last kept them, defaults filled in for any it lacks.
async function loadSettings($: EngineInterface): Promise<BarSettings> {
  const stored = await $.store.get('settings')
  const kept: Record<string, unknown> = typeof stored === 'object' && stored !== null ? { ...stored } : {}
  // Fields this version does not know are dropped, so they are not saved back.
  const loaded: BarSettings = {
    ...DEFAULT_SETTINGS,
    ...Object.fromEntries(Object.entries(kept).filter(([key]) => key in DEFAULT_SETTINGS)),
  }
  await update($, settings, () => loaded)

  return loaded
}

function notify($: EngineInterface, message: string): void {
  $.ui.toast(message)
}

// Applies a change from the settings card and keeps it for the next sessions.
async function changeSetting($: EngineInterface, change: Partial<BarSettings>): Promise<void> {
  const next = await update($, settings, was => ({ ...was, ...change }))
  await $.store.set('settings', next)
}

function toLimits(rateLimits: SessionRateLimit[]): Limit[] {
  return rateLimits.map(({ kind, percentUsed, resetsAt }) => ({ kind, percentUsed, resetsAt: resetsAt ?? null }))
}

async function refresh($: EngineInterface): Promise<void> {
  const { context, rateLimits, cost } = await $.session.usage({ breakdown: 'summary' })
  const { breakdown } = context

  if (!breakdown) {
    return
  }

  const next: Usage = {
    rows: distinctColors(breakdown.categories.map(({ name, color, tokens, kind }) => ({ name, color, tokens, kind }))),
    totalTokens: breakdown.totalTokens,
    maxTokens: breakdown.rawMaxTokens,
    percentage: breakdown.percentage,
    autoCompactThreshold: breakdown.autoCompactThreshold ?? null,
    model: breakdown.model,
    window: context.window,
    cost: cost?.usd ?? null,
    mcpServers: byServer(breakdown.mcpTools),
    memoryFiles: breakdown.memoryFiles.map(({ path, type, tokens }) => ({ path, type, tokens })),
    skills: (breakdown.skills?.skillFrontmatter ?? []).map(({ name, source, pluginName, tokens }) => ({ name, source, pluginName, tokens })),
    limits: toLimits(rateLimits),
  }
  await update($, usage, () => next)
}

// The plan limits a response just brought, kept with the moment they came.
async function stampLimits($: EngineInterface, rateLimits: SessionRateLimit[]): Promise<void> {
  const now = await $.clock.now()
  await update($, usage, was => (was === null ? null : { ...was, limits: toLimits(rateLimits) }))
  await update($, limitsAt, () => now)
}

const TICK_MS = 60_000
let ticking: Timer | null = null

// An idle band draws nothing new by itself, so the usage card's ages and countdowns are redrawn each minute.
function tick($: EngineInterface): void {
  ticking?.cancel()
  ticking = $.clock.every(TICK_MS, () => {
    void read($, panel).then(open => {
      if (open === 'usage') {
        $.ui.invalidate('ui.render')
      }
    })
  })
}

// The theme and the /model choices, from the config menu's own rows.
async function readConfig($: EngineInterface): Promise<void> {
  const rows = await $.config.list()
  const theme = rows.find(row => row.key === 'theme')?.value
  const choices = rows.find(row => row.key === 'model')?.options ?? []

  // `auto` follows the terminal, which the mod cannot see; it is drawn as dark.
  await update($, isLight, () => typeof theme === 'string' && theme.startsWith('light'))
  if (choices.length > 0) {
    await update($, models, () => modelChoices(choices))
  }
}

// How many agents are at work now, by the engine's own list.
async function countAgents($: EngineInterface): Promise<void> {
  const agents = await $.agent.list()
  const running = agents.filter(agent => agent.status === 'running' || agent.status === 'pending' || agent.status === 'waiting')
  await update($, runningAgents, () => running.length)
}

// Runs a slash command as if typed. Claude Code runs it once the session is idle, which can outlast a press's 10 s
// budget, so it starts from a timer once the press returns; `after` follows a run that worked.
function runSoon($: EngineInterface, command: string, args?: string, after?: () => Promise<void>): void {
  $.clock.after(0, () => {
    void (async () => {
      try {
        await $.command.run({ command, args })
      } catch {
        notify($, `/${[command, args].filter(Boolean).join(' ')} failed`)

        return
      }
      await after?.()
    })().catch(() => undefined)
  })
}

// Runs `/model` or `/effort` as if typed, so the session's own setting changes and the transcript says so.
async function choose($: EngineInterface, command: 'model' | 'effort', option: string): Promise<void> {
  await update($, panel, () => null)
  runSoon($, command, option, async () => {
    if (command === 'effort') {
      await update($, effort, () => option)
    }
    await refresh($)
  })
}

let filling: Timer | null = null

// Fills the used part of the bar from the left, easing out.
async function animateFill($: EngineInterface): Promise<void> {
  filling?.cancel()
  const startedAt = await $.clock.now()
  await update($, fill, () => 0)
  filling = $.clock.every(FRAME_MS, () => {
    void $.clock.now().then(async now => {
      const t = Math.min(1, (now - startedAt) / FILL_MS)
      await update($, fill, () => 1 - (1 - t) ** 3)
      if (t === 1) {
        filling?.cancel()
        filling = null
      }
    })
  })
}

const SETTLE_MS = 250
const SETTLE_TRIES = 20
let settling = 0

// Claude Code counts the compacted context a moment after /compact returns, so the figures are re-read until they
// drop: one read at a time, each 250 ms after the last, for five seconds at most.
async function refreshUntilDropped($: EngineInterface): Promise<void> {
  const poll = ++settling
  const before = (await read($, usage))?.totalTokens ?? Infinity
  const tick = (tries: number): void => {
    $.clock.after(SETTLE_MS, () => {
      void (async () => {
        if (poll !== settling) {
          return
        }
        await refresh($).catch(() => undefined)
        const now = (await read($, usage).catch(() => null))?.totalTokens ?? Infinity
        if (now >= before && tries < SETTLE_TRIES) {
          tick(tries + 1)
        }
      })()
    })
  }
  tick(1)
}

// The session's cost so far, or null where Claude Code keeps no ledger. The plain read costs nothing.
async function sessionCost($: EngineInterface): Promise<number | null> {
  return (await $.session.usage()).cost?.usd ?? null
}

// Who a request's loop is: the main loop, a subagent by its task description, or null for a loop no agent list names
// (Claude Code's own forks, such as a compaction).
async function spender($: EngineInterface, agentId: string | undefined, known: Spend | null): Promise<{ id: string; label: string } | null> {
  if (agentId === undefined) {
    return { id: MAIN, label: 'main' }
  }
  const seen = known?.agents.find(one => one.id === agentId)
  if (seen) {
    return seen
  }
  const listed = (await $.agent.list()).find(agent => agent.id === agentId)

  return listed ? { id: agentId, label: listed.description || listed.type } : null
}

async function count($: EngineInterface, change: (was: Tally) => Tally): Promise<void> {
  const now = await $.clock.now()
  await update($, tally, was => change(was ?? { since: now, apiMs: 0, activeMs: 0, models: {} }))
}

function addTokens(
  was: Tokens | undefined,
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number },
): Tokens {
  return {
    input: (was?.input ?? 0) + usage.input_tokens,
    output: (was?.output ?? 0) + usage.output_tokens,
    cacheRead: (was?.cacheRead ?? 0) + usage.cache_read_input_tokens,
    cacheWrite: (was?.cacheWrite ?? 0) + usage.cache_creation_input_tokens,
  }
}

async function toggleSection($: EngineInterface, key: Section): Promise<void> {
  await update($, sections, was => ({ ...was, [key]: !(was[key] ?? DEFAULT_OPEN[key]) }))
}

// Runs `/context` for its full breakdown, as if typed.
function showContext($: EngineInterface): void {
  runSoon($, 'context')
}

const CONFIRM_MS = 5000
let confirmExpiry: Timer | null = null

async function disarm($: EngineInterface): Promise<void> {
  confirmExpiry?.cancel()
  confirmExpiry = null
  await update($, confirming, () => null)
}

// The one way an action asks first: a first click arms it (drawn in red), a second runs it, and five seconds without
// one disarm it. One action is armed at a time; arming another, or closing or switching cards, disarms it.
async function confirmFirst($: EngineInterface, action: Confirmable, perform: () => Promise<void>): Promise<void> {
  const armed = await read($, confirming)
  await disarm($)
  if (armed === action) {
    await perform()

    return
  }
  await update($, confirming, () => action)
  confirmExpiry = $.clock.after(CONFIRM_MS, () => {
    void update($, confirming, was => (was === action ? null : was))
  })
}

// Puts every setting back to its default.
async function resetSettings($: EngineInterface): Promise<void> {
  await update($, settings, () => DEFAULT_SETTINGS)
  await $.store.set('settings', DEFAULT_SETTINGS)
  notify($, 'Settings reset to their defaults')
}

// Opening a card resets its sections to their defaults, so it always opens the same way.
async function toggle($: EngineInterface, which: Panel): Promise<Panel | null> {
  await disarm($)
  await update($, sections, () => ({}))

  return update($, panel, was => (was === which ? null : which))
}

async function close($: EngineInterface): Promise<void> {
  await disarm($)
  await update($, panel, () => null)
}

// Runs a slash command as if typed, closing the card first.
async function run($: EngineInterface, command: string, after?: () => Promise<void>): Promise<void> {
  await close($)
  runSoon($, command, undefined, after)
}

let settingUp = false

// Fills the session's state: the settings, whether the bar starts shown, and the figures.
async function setUp($: EngineInterface): Promise<void> {
  settingUp = true
  try {
    // A reload raises session.start again; the setting applies only to the session's first.
    const loaded = await loadSettings($).catch(() => DEFAULT_SETTINGS)
    if (!(await read($, isInitialized))) {
      await update($, isHidden, () => !loaded.showOnStart)
      await update($, isInitialized, () => true)
    }
    await readConfig($).catch(() => undefined)
    await refresh($).catch(() => undefined)
    // The cost so far is the earlier part; a reload keeps counting where it was.
    const cost = await sessionCost($).catch(() => null)
    if (cost !== null && (await read($, spend)) === null) {
      await update($, spend, () => startSpend(cost))
    }
    tick($)
  } finally {
    settingUp = false
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'context-bar',
      description: 'Show or hide the context window bar above the prompt',
    })
    const result = await next(e)
    await setUp($)

    return result
  })

  on('command.run', { command: 'context-bar' }, async $ => {
    const hidden = await update($, isHidden, was => !was)
    if (!hidden) {
      await animateFill($)
    }

    return { text: hidden ? 'Context bar hidden.' : 'Context bar shown.' }
  })

  // Raised after each main-thread turn and when a plan limit moves a whole point; a /compact raises none.
  on('session.measure', async ($, e, next) => {
    const result = await next(e)
    await refresh($).catch(() => undefined)

    return result
  })

  // A typed /compact is no turn, so turn.complete never follows it.
  on('command.run', { command: 'compact' }, async ($, e, next) => {
    const result = await next(e)
    await refreshUntilDropped($).catch(() => undefined)

    return result
  })

  on('turn.start', async ($, e, next) => {
    const current = await read($, usage)
    await update($, growth, was => ({ ...was, startTokens: current?.totalTokens ?? null, startCost: current?.cost ?? null }))

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) {
      await count($, was => ({ ...was, activeMs: was.activeMs + e.durationMs })).catch(() => undefined)
      await refresh($).catch(() => undefined)
      const current = await read($, usage)
      await update($, growth, was => {
        if (was.startTokens === null || current === null) {
          return { ...was, startTokens: null, startCost: null }
        }
        const delta = current.totalTokens - was.startTokens

        return {
          startTokens: null,
          startCost: null,
          lastDelta: delta,
          lastCost: was.startCost === null || current.cost === null ? was.lastCost : current.cost - was.startCost,
          deltas: [...was.deltas, delta].slice(-5),
        }
      })
    }
    await countAgents($).catch(() => undefined)

    return result
  })

  // The effort the main loop's last request was sent with; subagents' requests are left out.
  // Every request, subagents' included, counts toward the session's tokens and API time.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) {
      await update($, effort, () => (e.effort === undefined ? null : String(e.effort)))
    }
    const startedAt = await $.clock.now()
    const costBefore = await sessionCost($).catch(() => null)
    if (costBefore !== null) {
      await update($, spend, was => costAtStart(was, costBefore))
    }
    // Known before the request, so nothing comes between reading the total after it and counting it.
    const who = await spender($, e.agentId, await read($, spend)).catch(() => null)
    if (e.agentId !== undefined) {
      await countAgents($).catch(() => undefined)
    }
    const result = yield* next(e)
    const ms = (await $.clock.now()) - startedAt
    const { usage: spent } = result
    // The plain read costs nothing.
    const after = await $.session.usage().catch(() => null)
    const costAfter = after?.cost?.usd ?? null
    if (costAfter !== null) {
      await update($, spend, was => costAtEnd(was, costAfter, who, spent ? totalTokens(addTokens(undefined, spent)) : 0, spent?.model))
    }
    if (after !== null) {
      await stampLimits($, after.rateLimits).catch(() => undefined)
    }
    await count($, was => ({
      ...was,
      apiMs: was.apiMs + ms,
      models: spent ? { ...was.models, [spent.model]: addTokens(was.models[spent.model], spent) } : was.models,
    })).catch(() => undefined)

    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // A /clear wipes the session's state and raises no session.start; a render cannot write, so a timer sets it up.
    if (!settingUp && !(await read($, isInitialized))) {
      settingUp = true
      $.clock.after(0, () => void setUp($))
    }
    const current = await read($, usage)

    // Terminal only: the desktop app lays the band out in a proportional font, where its cells, shades and hover
    // cards do not line up, so it keeps its own band there.
    if (e.props.hasSurvey || current === null || (await read($, isHidden)) || e.surface !== 'terminal') {
      return next(e)
    }

    const hasUsage = current.limits.length > 0 || current.cost !== null
    const stored = await read($, panel)
    // A stored panel the band does not draw, or usage without figures to show, reads as closed.
    const open =
      stored === 'breakdown' || stored === 'settings' || stored === 'model' || stored === 'effort' || (stored === 'usage' && hasUsage)
        ? stored
        : null

    const chosen = await read($, settings)
    // The display mode follows Claude Code's theme unless the settings card fixes it.
    const isLightShading = chosen.displayMode === 'auto' ? await read($, isLight) : chosen.displayMode === 'light'

    return band(
      $.ui.resolve(e),
      {
        usage: { ...current, rows: themed(current.rows, chosen.categoryTheme, chosen.customColors) },
        width: e.props.bodyColumns,
        effort: await read($, effort),
        open,
        opened: await read($, sections),
        confirming: await read($, confirming),
        tally: await read($, tally),
        spend: await read($, spend),
        limitsAt: await read($, limitsAt),
        now: await $.clock.now(),
        fill: await read($, fill),
        isLight: isLightShading,
        models: await read($, models),
        growth: await read($, growth),
        runningAgents: await read($, runningAgents),
        settings: chosen,
        fieldRevision: await read($, fieldRevision),
        defaultColors: Object.fromEntries(current.rows.map(row => [row.name, row.color])),
      },
      {
        toggle: which => toggle($, which),
        toggleSection: key => toggleSection($, key),
        close: () => close($),
        choose: (command, option) => choose($, command, option),
        showContext: () => showContext($),
        // /compact swaps the conversation the model sees for a summary; /clear starts a new session (the old one stays
        // resumable with /resume). The mod's own /compact does not reach its command.run hook, so it re-reads itself.
        compact: () => confirmFirst($, 'compact', () => run($, 'compact', () => refreshUntilDropped($))),
        newSession: () => confirmFirst($, 'clear', () => run($, 'clear')),
        changeSetting: change => changeSetting($, change),
        notify: message => notify($, message),
        submitted: () => update($, fieldRevision, was => was + 1),
        resetSettings: () => confirmFirst($, 'reset', () => resetSettings($)),
      },
    )
  })
}
