import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { BAND, BREAKDOWN, CATEGORIES, configRows, surround, typed, usageWith } from './fixtures'
import { segments } from './layout'

test('draws the bar and toggles it with /context-bar', async ($, on) => {
  const clock = mock.clock(on, { now: Date.parse('2026-10-13T09:05:00.000Z') })
  on('session.usage', () => ({
    value: { startedAt: 0, cost: { usd: 1.16 }, rateLimits: [{ kind: 'five_hour', percentUsed: 9, resetsAt: '2026-10-13T11:30:00.000Z' }], context: { window: 200000, tokens: 50000, percent: 25, breakdown: BREAKDOWN } },
  }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text key="engine">engine band</Text>
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('config.list', () => ({ value: configRows('dark') }))
  const ran: string[] = []
  on('command.run', (_, e) => {
    ran.push(`/${e.command} ${e.args}`)

    return { text: 'ok' }
  })
  on('turn.step', async function* (_, e) {
    const usage = {
      model: 'claude-opus-5-5',
      input_tokens: 28,
      output_tokens: 7600,
      cache_read_input_tokens: 1_100_000,
      cache_creation_input_tokens: 43_500,
    }

    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage }
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  for await (const _ of $.turn.step({ turnId: 't1', index: 0, model: 'claude-opus-5-5', effort: 'high', messageCount: 1 })) {
    // drained
  }

  {
    const surface = 'terminal'
    const ui = await $.ui.mount({ plugin: 'context-bar', surface, ...BAND })
    expect(await ui.find({ key: 'bar' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /compacts at 167k/ })).toBeDefined()
    expect(await ui.find({ key: 'legend' })).toBeUndefined()
    expect(await ui.find({ key: 'model', text: /Opus 5\.5/ })).toBeDefined()
    expect(await ui.find({ key: 'effort', text: /high/ })).toBeDefined()
    expect(await ui.find({ key: 'card-Messages' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /47k · 24% of the window/ })).toBeDefined()
    await ui.press({ key: 'breakdown' })
    expect(await ui.find({ key: 'legend' })).toBeDefined()
    await ui.press({ key: 'breakdown' })
    expect(await ui.find({ key: 'legend' })).toBeUndefined()
    await ui.unmount()
  }

  const menus = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND })
  expect(await menus.find({ key: 'panel' })).toBeUndefined()
  await menus.press({ key: 'usage' })
  expect(await menus.find({ type: 'Text', text: /resets in 2 hr 25 min/ })).toBeDefined()
  await menus.press({ key: 'section-limits' })
  expect(await menus.find({ type: 'Text', text: /resets in/ })).toBeUndefined()
  expect(await menus.find({ type: 'Text', text: /9%/ })).toBeDefined()
  await menus.press({ key: 'close' })
  await menus.press({ key: 'usage' })
  expect(await menus.find({ type: 'Text', text: /resets in/ })).toBeDefined()
  expect(await menus.find({ type: 'Text', text: /cost \$1\.16/ })).toBeUndefined()
  await menus.press({ key: 'section-session' })
  await menus.press({ key: 'section-tokens' })
  expect(await menus.find({ type: 'Text', text: /cost \$1\.16/ })).toBeDefined()
  expect(await menus.find({ type: 'Text', text: /cache hit 96%/ })).toBeDefined()
  expect(await menus.find({ type: 'Text', text: /Opus 5\.5 100%/ })).toBeDefined()
  expect(await menus.find({ type: 'Text', text: /cache read\s+1\.1M/ })).toBeDefined()
  expect(await menus.find({ type: 'Text', text: /Opus 5\.5 · counted for the last/ })).toBeDefined()
  await menus.press({ key: 'clear' })
  expect(ran).not.toContain('/clear ')
  expect(await menus.find({ key: 'clear', text: /confirm new session/ })).toBeDefined()
  await menus.press({ key: 'close' })
  await menus.press({ key: 'usage' })
  expect(await menus.find({ key: 'clear', text: /confirm/ })).toBeUndefined()
  await menus.press({ key: 'clear' })
  await menus.press({ key: 'clear' })
  await clock.settle()
  expect(ran).toContain('/clear ')
  await menus.press({ key: 'usage' })
  await menus.press({ key: 'compact' })
  expect(ran).not.toContain('/compact ')
  await menus.press({ key: 'compact' })
  await clock.settle()
  expect(ran).toContain('/compact ')
  expect(await menus.find({ key: 'panel' })).toBeUndefined()
  await menus.press({ key: 'usage' })
  await menus.press({ key: 'breakdown' })
  expect(await menus.find({ key: 'legend' })).toBeDefined()
  expect(await menus.find({ key: 'limits' })).toBeUndefined()
  expect(await menus.find({ type: 'Text', text: /mcp tools.*—/ })).toBeDefined()
  expect(await menus.find({ key: 'body-mcp' })).toBeUndefined()
  await menus.press({ key: 'section-mcp' })
  expect(await menus.find({ type: 'Text', text: /docs 2 tools/ })).toBeDefined()
  await menus.press({ key: 'context' })
  await clock.settle()
  expect(ran).toContain('/context ')
  await menus.press({ key: 'effort' })
  expect(await menus.find({ key: 'legend' })).toBeUndefined()
  expect(await menus.find({ key: 'effort-max' })).toBeDefined()
  await menus.press({ key: 'effort-medium' })
  await clock.settle()
  expect(ran).toContain('/effort medium')
  expect(await menus.find({ key: 'panel' })).toBeUndefined()
  expect(await menus.find({ key: 'effort', text: /medium/ })).toBeDefined()
  await menus.press({ key: 'model' })
  await menus.press({ key: 'close' })
  expect(await menus.find({ key: 'panel' })).toBeUndefined()
  await menus.press({ key: 'model' })
  await menus.press({ key: 'model-fable[1m]' })
  await clock.settle()
  expect(ran).toContain('/model fable[1m]')
  await menus.unmount()

  const toggled = await $.command.run(typed('context-bar'))
  expect(toggled.text).toBe('Context bar hidden.')
  const hidden = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND })
  expect(await hidden.find({ key: 'bar' })).toBeUndefined()
})

test('fills the bar from the left when /context-bar shows it', async ($, on) => {
  const clock = mock.clock(on)
  on('session.usage', () => ({
    value: { startedAt: 0, rateLimits: [{ kind: 'five_hour', percentUsed: 9, resetsAt: '2026-10-13T11:30:00.000Z' }], context: { window: 200000, tokens: 50000, percent: 25, breakdown: BREAKDOWN } },
  }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text key="engine">engine band</Text>
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.command.run(typed('context-bar'))
  await $.command.run(typed('context-bar'))

  const ui = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND })
  // Cells drawn in a category's color, not as free space.
  const colored = async () =>
    (await ui.findAll({ type: 'Text', text: /^▓+$/ }))
      .reduce((sum, found) => sum + (found.text?.length ?? 0), 0)
  const used = segments(CATEGORIES, BAND.props.bodyColumns - 4)
    .filter(seg => seg.kind === 'used')
    .reduce((sum, seg) => sum + seg.cells, 0)
  expect(await colored()).toBe(0)
  await clock.advance(120)
  expect(await colored()).toBeGreaterThan(0)
  expect(await colored()).toBeLessThan(used)
  await clock.advance(300)
  expect(await colored()).toBe(used)
})


// Claude Code runs a command once the session is idle, which can outlast a press's 10 s budget.
test('returns from a press without waiting for the command it starts', async ($, on) => {
  const clock = surround(on, 'dark', 25)
  const ran: string[] = []
  let release = () => {}
  on('command.run', (_, e) => {
    ran.push(`/${e.command}`)

    return new Promise(resolve => {
      release = () => resolve({ text: 'ok' })
    })
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND })
  await ui.press({ key: 'breakdown' })
  await ui.press({ key: 'context' })
  await clock.settle()
  expect(ran).toEqual(['/context'])
  release()
})

test('starts hidden when the bar is set not to show at start', async ($, on) => {
  surround(on, 'dark', 25, { settings: { showOnStart: false } })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'bar' })).toBeUndefined()
})

// A /clear wipes the session's state and raises no session.start: the band finds it so when it draws.
test('draws the bar again in the fresh session a /clear starts', async ($, on) => {
  const clock = surround(on, 'dark', 25, { settings: { contextWarnPercent: 20 } })
  const ui = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'bar' })).toBeUndefined()
  await clock.settle()
  expect(await ui.find({ key: 'bar' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Context at 25%/ })).toBeDefined()
})

test('starts hidden after a /clear when the bar is set not to show at start', async ($, on) => {
  const clock = surround(on, 'dark', 25, { settings: { showOnStart: false } })
  const ui = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND })
  await clock.settle()
  expect(await ui.find({ key: 'bar' })).toBeUndefined()
})

test('draws the shades on white for a light theme', async ($, on) => {
  surround(on, 'light', 25)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND })
  const shades = await ui.findAll({ type: 'Text', text: /^▓+$/ })
  expect(shades.length).toBeGreaterThan(0)
  expect(shades.every(found => found.props.backgroundColor === 'white')).toBe(true)
})

test('changes a setting from the settings card and keeps it', async ($, on) => {
  const toasts: string[] = []
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  const kept: unknown[] = []
  on('store.get', () => ({ value: undefined }))
  on('store.set', (_, e) => {
    kept.push(e.value)

    return { value: undefined }
  })
  surround(on, 'dark', 25, null)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND })
  await ui.press({ key: 'settings' })
  await ui.input({ key: 'input-contextWarnPercent-0', text: '80' })
  expect(toasts).toEqual(['Context warning set to 80%'])
  // The same value saved again: the field is drawn afresh, holding it, rather than left blank.
  expect((await ui.find({ key: 'input-contextWarnPercent-1' }))?.props.value).toBe('80')
  await ui.input({ key: 'input-contextWarnPercent-1', text: '65' })
  expect((await ui.find({ key: 'input-contextWarnPercent-2' }))?.props.value).toBe('65')
  await ui.press({ key: 'setting-showOnStart' })
  expect(await ui.find({ key: 'setting-showOnStart', text: /false/ })).toBeDefined()
  expect(kept.at(-1)).toMatchObject({ showOnStart: false, contextWarnPercent: 65, limitWarnPercent: 90 })
  await ui.input({ key: 'input-limitWarnPercent-2', text: 'lots' })
  expect(kept.at(-1)).toMatchObject({ limitWarnPercent: 90 })
  expect(toasts.at(-1)).toBe('Type a whole number from 0 to 100; 0 turns the warning off.')
})

test('fixes the display mode and themes the categories from the settings card', async ($, on) => {
  surround(on, 'dark', 25)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND })
  const shades = async () => ui.findAll({ type: 'Text', text: /^▓+$/ })
  await ui.press({ key: 'settings' })
  await ui.press({ key: 'setting-displayMode' })
  await ui.press({ key: 'setting-displayMode' })
  expect(await ui.find({ key: 'setting-displayMode', text: /light/ })).toBeDefined()
  expect((await shades()).every(found => found.props.backgroundColor === 'white')).toBe(true)
  expect(await ui.find({ key: 'setting-color-Messages' })).toBeUndefined()
  await ui.press({ key: 'setting-categoryTheme' })
  expect(await ui.find({ key: 'setting-categoryTheme', text: /monokai/ })).toBeDefined()
  expect((await shades()).some(found => found.props.color === '#66D9EF')).toBe(true)
  await ui.press({ key: 'setting-categoryTheme' })
  expect(await ui.find({ key: 'setting-categoryTheme', text: /dracula/ })).toBeDefined()
  expect((await shades()).some(found => found.props.color === '#BD93F9')).toBe(true)
  // nord, catppuccin, github, gruvbox, tokyo night, then custom.
  for (const name of ['nord', 'catppuccin', 'github', 'gruvbox', 'tokyo night', 'custom']) {
    await ui.press({ key: 'setting-categoryTheme' })
    expect(await ui.find({ key: 'setting-categoryTheme', text: new RegExp(name) })).toBeDefined()
  }
  expect(await ui.find({ key: 'input-color-Messages-0' })).toBeDefined()
  expect((await ui.find({ key: 'input-color-Messages-0' }))?.props.value).toBe('#6A9BCC')
  await ui.input({ key: 'input-color-Messages-0', text: 'orange' })
  expect((await shades()).some(found => found.props.color === '#6A9BCC')).toBe(true)
  await ui.input({ key: 'input-color-Messages-1', text: '#ff6188' })
  expect((await shades()).some(found => found.props.color === '#FF6188')).toBe(true)
  await ui.input({ key: 'input-color-Messages-2', text: '' })
  expect((await shades()).some(found => found.props.color === '#6A9BCC')).toBe(true)
})

test('drops header detail as the band narrows', async ($, on) => {
  surround(on, 'dark', 25)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const wide = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND, props: { ...BAND.props, bodyColumns: 160 } })
  expect(await wide.find({ type: 'Text', text: /of 200k · compacts at 167k/ })).toBeDefined()
  await wide.unmount()
  const narrow = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND, props: { ...BAND.props, bodyColumns: 80 } })
  expect(await narrow.find({ type: 'Text', text: /of 200k · compacts at/ })).toBeUndefined()
  expect(await narrow.find({ type: 'Text', text: /of 200k/ })).toBeDefined()
})

test('resets the settings after a confirmation', async ($, on) => {
  const kept: unknown[] = []
  on('store.get', () => ({ value: { contextWarnPercent: 65, categoryTheme: 'nord' } }))
  on('store.set', (_, e) => {
    kept.push(e.value)

    return { value: undefined }
  })
  surround(on, 'dark', 25, null)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND })
  await ui.press({ key: 'settings' })
  expect((await ui.find({ key: 'input-contextWarnPercent-0' }))?.props.value).toBe('65')
  await ui.press({ key: 'reset' })
  expect(kept).toEqual([])
  expect(await ui.find({ key: 'reset', text: /confirm reset/ })).toBeDefined()
  await ui.press({ key: 'reset' })
  expect(kept.at(-1)).toMatchObject({ contextWarnPercent: 80, categoryTheme: 'default', costWarnUsd: 50 })
  expect((await ui.find({ key: 'input-contextWarnPercent-0' }))?.props.value).toBe('80')
})

test('shows the warning line as soon as a threshold is set below the figure', async ($, on) => {
  surround(on, 'dark', 25, {}, 33.4)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /^⚠/ })).toBeUndefined()
  await ui.press({ key: 'settings' })
  await ui.input({ key: 'input-costWarnUsd-0', text: '32' })
  expect(await ui.find({ type: 'Text', text: /^Session cost \$33\.40, past your \$32$/ })).toBeDefined()
  await ui.input({ key: 'input-costWarnUsd-1', text: '0' })
  expect(await ui.find({ type: 'Text', text: /^⚠/ })).toBeUndefined()
})

test('shows the growth and cost of a turn, the turns left and running agents', async ($, on) => {
  mock.clock(on, { now: Date.parse('2026-10-13T09:05:00.000Z') })
  mock.store(on, {})
  let total = 50_000
  let cost = 1
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      rateLimits: [],
      cost: { usd: cost },
      context: { window: 200000, tokens: total, percent: 25, breakdown: { ...BREAKDOWN, totalTokens: total, percentage: Math.round(total / 2000) } },
    },
  }))
  on('config.list', () => ({ value: configRows('dark') }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('agent.list', () => ({ value: [{ id: 'a1', description: 'review', type: 'general-purpose', status: 'running' }] as never }))
  const ran: string[] = []
  on('command.run', (_, e) => {
    ran.push(`/${e.command}`)

    return { text: 'ok' }
  })
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text key="engine">engine band</Text>
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const finish = { answer: 'ok', durationMs: 1000, isAborted: false, reason: 'answer' as const }
  await $.turn.start({ text: 'go', turnId: 't1' })
  total += 10_000
  cost += 0.42
  await $.turn.complete({ ...finish, turnId: 't1' })

  const ui = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND, props: { ...BAND.props, bodyColumns: 200 } })
  // 60k of 200k, warning at 80% (160k), 10k a turn: 10 turns.
  expect(await ui.find({ type: 'Text', text: /\+10k · \$0\.42 last turn · ≈ 10 turns to 80%/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^1 agent$/ })).toBeDefined()
  expect(ran).toEqual([])
})

test('asks before /compact from the word in the context warning, and lets the question lapse', async ($, on) => {
  const clock = surround(on, 'dark', 85)
  const ran: string[] = []
  on('command.run', (_, e) => {
    ran.push(`/${e.command}`)

    return { text: 'ok' }
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND })
  await ui.press({ key: 'warning-compact' })
  expect(ran).toEqual([])
  expect(await ui.find({ key: 'warning-compact', text: /\/compact\?/ })).toBeDefined()
  await clock.advance(5000)
  expect(await ui.find({ key: 'warning-compact', text: /\/compact\?/ })).toBeUndefined()
  await ui.press({ key: 'warning-compact' })
  await ui.press({ key: 'warning-compact' })
  expect(ran).toEqual([])
  await clock.settle()
  expect(ran).toEqual(['/compact'])
})

test('drops stored settings it does not know', async ($, on) => {
  const kept: unknown[] = []
  on('store.get', () => ({ value: { contextWarnPercent: 70, retired: 'dark', unknown: 'custom' } }))
  on('store.set', (_, e) => {
    kept.push(e.value)

    return { value: undefined }
  })
  surround(on, 'dark', 25, null)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND })
  await ui.press({ key: 'settings' })
  await ui.press({ key: 'setting-showOnStart' })
  expect(kept.at(-1)).toMatchObject({ contextWarnPercent: 70, showOnStart: false })
  expect(kept.at(-1)).not.toHaveProperty('retired')
  expect(kept.at(-1)).not.toHaveProperty('unknown')
})

test('lets every armed confirmation lapse after five seconds, and arms one at a time', async ($, on) => {
  const clock = surround(on, 'dark', 25, {}, 12)
  const ran: string[] = []
  on('command.run', (_, e) => {
    ran.push(`/${e.command}`)

    return { text: 'ok' }
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND })
  await ui.press({ key: 'usage' })
  await ui.press({ key: 'clear' })
  expect(await ui.find({ key: 'clear', text: /confirm new session/ })).toBeDefined()
  await clock.advance(5000)
  expect(await ui.find({ key: 'clear', text: /confirm/ })).toBeUndefined()
  // Arming compact disarms new session: a click on new session then only arms it.
  await ui.press({ key: 'clear' })
  await ui.press({ key: 'compact' })
  expect(await ui.find({ key: 'clear', text: /confirm/ })).toBeUndefined()
  await ui.press({ key: 'clear' })
  expect(ran).toEqual([])
  await ui.press({ key: 'settings' })
  await ui.press({ key: 'reset' })
  expect(await ui.find({ key: 'reset', text: /confirm reset/ })).toBeDefined()
  await clock.advance(5000)
  expect(await ui.find({ key: 'reset', text: /confirm/ })).toBeUndefined()
})

test('leaves the desktop band to the engine', async ($, on) => {
  surround(on, 'dark', 25)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'context-bar', surface: 'desktop', ...BAND })
  expect(await ui.find({ type: 'Text', text: /engine band/ })).toBeDefined()
  expect(await ui.find({ key: 'breakdown' })).toBeUndefined()
})

// A real compaction takes a while: /compact answers only once the test releases it.
const compacting = (on: On, percentage: number) => {
  const figures = { tokens: 162000, percentage, reads: 0, readMs: 0, reading: 0, mostReading: 0 }
  const clock = surround(on, 'dark', async () => {
    figures.reads += 1
    figures.reading += 1
    figures.mostReading = Math.max(figures.mostReading, figures.reading)
    if (figures.readMs > 0) {
      await clock.sleep(figures.readMs)
    }
    figures.reading -= 1

    return usageWith(figures.percentage, null, figures.tokens)
  })
  let release = () => {}
  on('command.run', () => new Promise(resolve => (release = () => resolve({ text: 'ok' }))))
  const compacted = (to: { tokens: number; percentage: number }) => Object.assign(figures, to)

  return { clock, figures, compacted, release: () => release() }
}

const COMPACTED = { tokens: 24000, percentage: 12 }

test('re-reads the figures once /compact ends, until they drop', async ($, on) => {
  const { clock, figures, compacted, release } = compacting(on, 81)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ran = $.command.run(typed('compact'))
  const before = figures.reads
  await clock.advance(5000)
  expect(figures.reads).toBe(before)
  release()
  await ran
  const ui = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND })
  await clock.advance(250)
  expect(await ui.find({ type: 'Text', text: /^ 81% $/ })).toBeDefined()
  compacted(COMPACTED)
  await clock.advance(250)
  expect(await ui.find({ type: 'Text', text: /^ 12% $/ })).toBeDefined()
  const reads = figures.reads
  await clock.advance(5000)
  expect(figures.reads).toBe(reads)
})

test('keeps re-reading after /compact past figures that grew since the last refresh', async ($, on) => {
  const { clock, compacted, release } = compacting(on, 81)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  compacted({ tokens: 165000, percentage: 83 })
  const ran = $.command.run(typed('compact'))
  await clock.settle()
  release()
  await ran
  const ui = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND })
  await clock.advance(250)
  expect(await ui.find({ type: 'Text', text: /^ 83% $/ })).toBeDefined()
  compacted(COMPACTED)
  await clock.advance(250)
  expect(await ui.find({ type: 'Text', text: /^ 12% $/ })).toBeDefined()
})

test('re-reads the figures after /compact one read at a time', async ($, on) => {
  const { clock, figures, release } = compacting(on, 81)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  figures.readMs = 600
  const ran = $.command.run(typed('compact'))
  await clock.settle()
  release()
  await ran
  await clock.advance(5000)
  expect(figures.mostReading).toBe(1)
})

test('re-reads the figures for five seconds when a /compact leaves them as they were', async ($, on) => {
  const { clock, figures, release } = compacting(on, 81)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ran = $.command.run(typed('compact'))
  await clock.settle()
  release()
  await ran
  const before = figures.reads
  await clock.advance(5000)
  expect(figures.reads).toBe(before + 20)
  await clock.advance(5000)
  expect(figures.reads).toBe(before + 20)
})

test('re-reads the figures once a /compact clicked in the band ends', async ($, on) => {
  const { clock, figures, compacted, release } = compacting(on, 85)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'context-bar', surface: 'terminal', ...BAND })
  await ui.press({ key: 'warning-compact' })
  await ui.press({ key: 'warning-compact' })
  await clock.settle()
  const before = figures.reads
  await clock.advance(5000)
  expect(figures.reads).toBe(before)
  release()
  await clock.advance(250)
  expect(await ui.find({ type: 'Text', text: /^ 85% $/ })).toBeDefined()
  compacted(COMPACTED)
  await clock.advance(250)
  expect(await ui.find({ type: 'Text', text: /^ 12% $/ })).toBeDefined()
})
