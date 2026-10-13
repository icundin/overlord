import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { BarSettings, Panel, Section, Tally, Tokens, Usage } from '../types'
import { byServer } from './figures'
import { modelChoices } from './format'
import { distinctColors, themed } from './themes'
import { DEFAULT_OPEN, DEFAULT_SETTINGS } from './defaults'
import { band } from './view/band'

const usage = atom({ plugin: 'context-bar', key: 'usage' } as const, null)
const isHidden = atom({ plugin: 'context-bar', key: 'isHidden' } as const, false)
const effort = atom({ plugin: 'context-bar', key: 'effort' } as const, null)
const panel = atom({ plugin: 'context-bar', key: 'panel' } as const, null)
const fill = atom({ plugin: 'context-bar', key: 'fill' } as const, 1)
const sections = atom({ plugin: 'context-bar', key: 'sections' } as const, {})
const tally = atom({ plugin: 'context-bar', key: 'tally' } as const, null)
const isConfirmingClear = atom({ plugin: 'context-bar', key: 'isConfirmingClear' } as const, false)
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
const isConfirmingReset = atom({ plugin: 'context-bar', key: 'isConfirmingReset' } as const, false)

const FRAME_MS = 30
const FILL_MS = 300

// The settings as $.store last kept them, defaults filled in for any it lacks.
async function loadSettings($: EngineInterface): Promise<BarSettings> {
  const stored = await $.store.get('settings')
  const kept: Record<string, unknown> = typeof stored === 'object' && stored !== null ? { ...stored } : {}
  // Fields an older version stored and this one no longer has are dropped, so they are not saved back.
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
    limits: rateLimits.map(({ kind, percentUsed, resetsAt }) => ({ kind, percentUsed, resetsAt: resetsAt ?? null })),
  }
  await update($, usage, () => next)
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

// Runs `/model` or `/effort` as if typed, so the session's own setting changes and the transcript says so.
async function choose($: EngineInterface, command: 'model' | 'effort', option: string): Promise<void> {
  await update($, panel, () => null)

  try {
    await $.command.run({ command, args: option })
    if (command === 'effort') {
      await update($, effort, () => option)
    }
    await refresh($)
  } catch {
    $.ui.toast(`/${command} ${option} failed`)
  }
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
async function showContext($: EngineInterface): Promise<void> {
  try {
    await $.command.run({ command: 'context' })
  } catch {
    $.ui.toast('/context failed')
  }
}

// Puts every setting back to its default; the first press only asks.
async function resetSettings($: EngineInterface): Promise<void> {
  if (!(await read($, isConfirmingReset))) {
    await update($, isConfirmingReset, () => true)

    return
  }
  await update($, isConfirmingReset, () => false)
  await update($, settings, () => DEFAULT_SETTINGS)
  await $.store.set('settings', DEFAULT_SETTINGS)
  $.ui.toast('Settings reset to their defaults')
}

// Opening a card resets its sections to their defaults, so it always opens the same way.
async function toggle($: EngineInterface, which: Panel): Promise<Panel | null> {
  await update($, isConfirmingClear, () => false)
  await update($, isConfirmingReset, () => false)
  await update($, sections, () => ({}))

  return update($, panel, was => (was === which ? null : which))
}

async function close($: EngineInterface): Promise<void> {
  await update($, isConfirmingClear, () => false)
  await update($, isConfirmingReset, () => false)
  await update($, panel, () => null)
}

// Runs a slash command as if typed, closing the card first.
async function run($: EngineInterface, command: string): Promise<void> {
  await close($)

  try {
    await $.command.run({ command })
  } catch {
    $.ui.toast(`/${command} failed`)
  }
}

// `/clear` starts a new session (the old one stays resumable with /resume); the first press only asks.
async function newSession($: EngineInterface): Promise<void> {
  if (await read($, isConfirmingClear)) {
    await run($, 'clear')
  } else {
    await update($, isConfirmingClear, () => true)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'context-bar',
      description: 'Show or hide the context window bar above the prompt',
    })
    // A reload raises session.start again; the setting applies only to the session's first.
    const loaded = await loadSettings($).catch(() => DEFAULT_SETTINGS)
    if (!(await read($, isInitialized))) {
      await update($, isHidden, () => !loaded.showOnStart)
      await update($, isInitialized, () => true)
    }
    const result = await next(e)
    await readConfig($).catch(() => undefined)
    await refresh($).catch(() => undefined)

    return result
  })

  on('command.run', { command: 'context-bar' }, async $ => {
    const hidden = await update($, isHidden, was => !was)
    if (!hidden) {
      await animateFill($)
    }

    return { text: hidden ? 'Context bar hidden.' : 'Context bar shown.' }
  })

  // Raised whenever the context's fill, a plan limit or the cost moves; not every session raises it, so
  // turn.complete refreshes too.
  on('session.measure', async ($, e, next) => {
    const result = await next(e)
    await refresh($).catch(() => undefined)

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
          deltas: [...(was.deltas ?? []), delta].slice(-5),
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
    if (e.agentId !== undefined) {
      await countAgents($).catch(() => undefined)
    }
    const result = yield* next(e)
    const ms = (await $.clock.now()) - startedAt
    const { usage: spent } = result
    await count($, was => ({
      ...was,
      apiMs: was.apiMs + ms,
      models: spent ? { ...was.models, [spent.model]: addTokens(was.models[spent.model], spent) } : was.models,
    })).catch(() => undefined)

    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, usage)

    // The band is raised on the terminal and desktop only; the check narrows the surface for the element table.
    if (e.props.hasSurvey || current === null || (await read($, isHidden)) || (e.surface !== 'terminal' && e.surface !== 'desktop')) {
      return next(e)
    }

    const hasUsage = (current.limits ?? []).length > 0 || current.cost != null
    const stored = await read($, panel)
    // A panel this version no longer has (an older one's `details`) reads as closed.
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
        isConfirmingClear: await read($, isConfirmingClear),
        tally: await read($, tally),
        now: await $.clock.now(),
        fill: await read($, fill),
        isLight: isLightShading,
        models: await read($, models),
        growth: await read($, growth),
        runningAgents: await read($, runningAgents),
        settings: chosen,
        fieldRevision: await read($, fieldRevision),
        isConfirmingReset: await read($, isConfirmingReset),
        defaultColors: Object.fromEntries(current.rows.map(row => [row.name, row.color])),
      },
      {
        toggle: which => toggle($, which),
        toggleSection: key => toggleSection($, key),
        close: () => close($),
        choose: (command, option) => choose($, command, option),
        showContext: () => showContext($),
        compact: () => run($, 'compact'),
        newSession: () => newSession($),
        changeSetting: change => changeSetting($, change),
        notify: message => notify($, message),
        submitted: () => update($, fieldRevision, was => was + 1),
        resetSettings: () => resetSettings($),
      },
    )
  })
}
