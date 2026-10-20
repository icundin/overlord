import { expect, test } from 'claude-code/testing'

import { HOME, PANE, SETTINGS, START, surround, typed } from './fixtures'
import { clockText } from './line'
import { entryFor } from './settings'

const SAVED = { items: ['folder', 'branch', 'ahead', 'dirty', 'model', 'cost'], icons: false, interval: 2 }

type Mounted = { findAll: (query: { type: 'Text'; text: string }) => Promise<{ props: { color?: unknown } }[]> }

// The colors the preview draws `text` in: the segment's own, the row around it having none.
const colorsOf = async (ui: Mounted, text: string) =>
  (await ui.findAll({ type: 'Text', text })).map(one => one.props.color).filter(color => color !== undefined)

test('keeps the saved line in the env var the command prints', async ($, on) => {
  const world = surround(on, { stored: { choices: SAVED } })
  await $.session.start(START)

  expect(world.lines.at(-1)).toBe('~/Code/overlord  main ↑2 ●  Opus 5.5  $0.17')
  expect(world.ran.filter(argv => argv[0] === 'gh')).toHaveLength(0)
})

test('sets no line before one is saved', async ($, on) => {
  const world = surround(on)
  await $.session.start(START)

  expect(world.lines).toEqual([])
})

test('follows the git state, and a save made in another session', async ($, on) => {
  const world = surround(on, { stored: { choices: SAVED } })
  await $.session.start(START)
  world.store.set('choices', { ...SAVED, items: ['branch'] })
  await world.clock.advance(5000)

  expect(world.lines.at(-1)).toBe('main')
})

test('shows the effort of the main loop once a request is sent', async ($, on) => {
  const world = surround(on, { stored: { choices: { ...SAVED, items: ['model', 'effort'] } } })
  on('turn.step', async function* (_, e) {
    const usage = { model: e.model, input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage }
  })
  await $.session.start(START)
  for await (const _ of $.turn.step({ turnId: 't1', index: 0, model: 'claude-sonnet-5-5', effort: 'high', messageCount: 1 })) {
    // drained
  }

  expect(world.lines.at(-1)).toBe('Sonnet 5.5 (high)')
})

test('shows the local estimate of the context until Claude Code reports it', async ($, on) => {
  const world = surround(on, { stored: { choices: { ...SAVED, items: ['context'] } }, context: { percent: null, estimate: 4 } })
  await $.session.start(START)

  expect(world.lines.at(-1)).toBe('ctx 4%')
})

test('shows the saved effort until the first request says which one the session runs on', async ($, on) => {
  const world = surround(on, { stored: { choices: { ...SAVED, items: ['effort'] } }, settings: { effortLevel: 'medium' } })
  on('turn.step', async function* (_, e) {
    const usage = { model: e.model, input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage }
  })
  await $.session.start(START)
  expect(world.lines.at(-1)).toBe('medium')
  for await (const _ of $.turn.step({ turnId: 't1', index: 0, model: 'claude-opus-5-5', effort: 'high', messageCount: 1 })) {
    // drained
  }

  expect(world.lines.at(-1)).toBe('high')
})

test('draws the tokens, the plan windows counting down, and the clock as it moves on', async ($, on) => {
  const world = surround(on, { stored: { choices: { ...SAVED, items: ['tokens', 'session', 'clock'], resets: ['session'] } } })
  await $.session.start(START)
  const at = (ms: number) => clockText(new Date(Date.parse('2026-10-19T09:00:00.000Z') + ms))
  expect(world.lines.at(-1)).toBe(`${at(0)}  ctx 10k / 200k  5h 12% (3h)`)
  await world.clock.advance(60_000)

  expect(world.lines.at(-1)).toBe(`${at(60_000)}  ctx 10k / 200k  5h 12% (2h 59m)`)
})

test('counts the estimated tokens until Claude Code reports them', async ($, on) => {
  const world = surround(on, { stored: { choices: { ...SAVED, items: ['context', 'tokens'] } }, context: { percent: null, estimate: 4 } })
  await $.session.start(START)

  expect(world.lines.at(-1)).toBe('ctx 4% · 8k / 200k')
})

test('reads the figures again after each turn', async ($, on) => {
  const scene = { stored: { choices: { ...SAVED, items: ['context'] } }, context: { percent: 5 as number | null, estimate: 5 } }
  const world = surround(on, scene)
  on('session.measure', (_, e) => ({ changed: e.changed }))
  await $.session.start(START)
  expect(world.lines.at(-1)).toBe('ctx 5%')
  scene.context = { percent: 40, estimate: 40 }
  await $.session.measure({ context: { window: 200000, tokens: 80000, percent: 40 }, rateLimits: [], changed: ['context'] })

  expect(world.lines.at(-1)).toBe('ctx 40%')
})

test("leaves the effort to the main loop's requests, not a subagent's", async ($, on) => {
  const world = surround(on, { stored: { choices: { ...SAVED, items: ['effort'] } }, settings: { effortLevel: 'high' } })
  on('turn.step', async function* (_, e) {
    const usage = { model: e.model, input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage }
  })
  await $.session.start(START)
  for await (const _ of $.turn.step({ turnId: 't1', index: 0, model: 'claude-haiku-5-5', effort: 'low', messageCount: 1, agentId: 'a1' })) {
    // drained
  }

  expect(world.lines.at(-1)).toBe('high')
})

test('asks for the pull request only while its item is on, once a minute', async ($, on) => {
  const pr = JSON.stringify({ number: 26, state: 'OPEN', isDraft: false, reviewDecision: 'APPROVED' })
  const world = surround(on, { stored: { choices: { ...SAVED, items: ['pr'] } }, commands: { 'gh pr': pr } })
  await $.session.start(START)
  expect(world.lines.at(-1)).toBe('PR #26 approved')
  await world.clock.advance(30_000)
  expect(world.ran.filter(argv => argv[0] === 'gh')).toHaveLength(1)
  await world.clock.advance(30_000)
  expect(world.ran.filter(argv => argv[0] === 'gh')).toHaveLength(2)
})

test('opens the pane, previews the choices, and saves after showing the change', async ($, on) => {
  const world = surround(on, { files: { [SETTINGS]: '{\n  "model": "opus"\n}\n' } })
  await $.session.start(START)
  const answer = await $.command.run(typed('statusline-wizard'))
  expect(answer).toMatchObject({ text: expect.stringContaining('pane') })
  expect(world.opened).toEqual(['statusline-wizard'])

  const ui = await $.ui.mount({ plugin: 'statusline-wizard', surface: 'terminal', ...PANE })
  expect(await ui.find({ type: 'Text', text: 'you@host  ~/Code/project  main ↑2 ●  Opus 5.5  ctx 5%' })).toBeDefined()
  expect(await ui.find({ key: 'remove' })).toBeUndefined()
  await ui.press({ key: 'item-user' })
  await ui.press({ key: 'icons' })
  expect(await ui.find({ type: 'Text', text: '📁 ~/Code/project  🌿 main ↑2 ●  🤖 Opus 5.5  📊 5%' })).toBeDefined()
  await ui.press({ key: 'interval' })
  await ui.press({ key: 'interval' })

  await ui.press({ key: 'save' })
  expect(world.files.get(SETTINGS)).toBe('{\n  "model": "opus"\n}\n')
  expect(await ui.find({ key: 'save', text: / confirm save / })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'Press again to set this as your status line in ~/.claude/settings.json.' })).toBeDefined()
  await ui.press({ key: 'save' })
  await ui.unmount()

  expect(JSON.parse(world.files.get(SETTINGS) ?? '')).toEqual({ model: 'opus', statusLine: entryFor('bash', 5) })
  expect(world.files.get(`${SETTINGS}.statusline-wizard.bak`)).toBe('{\n  "model": "opus"\n}\n')
  expect(world.store.get('choices')).toEqual({
    items: ['folder', 'branch', 'ahead', 'dirty', 'model', 'context'],
    resets: [],
    icons: true,
    interval: 5,
    theme: 'none',
    colors: {},
  })
  expect(world.lines.at(-1)).toBe('📁 ~/Code/overlord  🌿 main ↑2 ●  🤖 Opus 5.5  📊 5%')
  expect(world.opened).toEqual(['statusline-wizard'])
  expect(world.toasts).toContain('Status line saved')
})

test('previews every item chosen from examples, whatever the session has to show', async ($, on) => {
  surround(on, { commands: { 'git --no-optional-locks': '# branch.head main\n# branch.ab +0 -0\n' } })
  await $.session.start(START)
  await $.command.run(typed('statusline-wizard'))
  const ui = await $.ui.mount({ plugin: 'statusline-wizard', surface: 'terminal', ...PANE })
  for (const key of ['behind', 'counts', 'pr']) {
    await ui.press({ key: `item-${key}` })
  }

  expect(await ui.find({ type: 'Text', text: 'you@host  ~/Code/project  main ↑2 ↓1 ● +2 ~3 ?1  PR #26 approved  Opus 5.5  ctx 5%' })).toBeDefined()
  await ui.unmount()
})

test('saves new choices without asking when the settings entry stays the same', async ($, on) => {
  const world = surround(on, { stored: { choices: SAVED }, files: { [SETTINGS]: JSON.stringify({ statusLine: entryFor('bash', 2) }) } })
  await $.session.start(START)
  await $.command.run(typed('statusline-wizard'))
  const ui = await $.ui.mount({ plugin: 'statusline-wizard', surface: 'terminal', ...PANE })
  await ui.press({ key: 'item-cost' })
  await ui.press({ key: 'save' })
  await ui.unmount()

  expect(world.files.has(`${SETTINGS}.statusline-wizard.bak`)).toBe(false)
  expect(world.lines.at(-1)).toBe('~/Code/overlord  main ↑2 ●  Opus 5.5')
})

test('removes its entry and puts back the one it replaced', async ($, on) => {
  const old = { type: 'command', command: '~/.claude/statusline.sh' }
  const world = surround(on, { files: { [SETTINGS]: JSON.stringify({ statusLine: old }) } })
  await $.session.start(START)
  await $.command.run(typed('statusline-wizard'))
  const ui = await $.ui.mount({ plugin: 'statusline-wizard', surface: 'terminal', ...PANE })
  await ui.press({ key: 'save' })
  await ui.press({ key: 'save' })
  await ui.unmount()
  expect(JSON.parse(world.files.get(SETTINGS) ?? '').statusLine).toEqual(entryFor('bash', 2))

  await $.command.run(typed('statusline-wizard'))
  const again = await $.ui.mount({ plugin: 'statusline-wizard', surface: 'terminal', ...PANE })
  await again.press({ key: 'remove' })
  expect(await again.find({ type: 'Text', text: 'Press again to put back the status line you had before.' })).toBeDefined()
  await again.press({ key: 'remove' })
  await again.unmount()

  expect(JSON.parse(world.files.get(SETTINGS) ?? '')).toEqual({ statusLine: old })
  expect(world.toasts).toContain('Status line removed')
})

test('keeps the status line it first replaced, however often it saves', async ($, on) => {
  const old = { type: 'command', command: '~/.claude/statusline.sh' }
  const world = surround(on, { files: { [SETTINGS]: JSON.stringify({ statusLine: old }) } })
  await $.session.start(START)
  await $.command.run(typed('statusline-wizard'))
  const ui = await $.ui.mount({ plugin: 'statusline-wizard', surface: 'terminal', ...PANE })
  await ui.press({ key: 'save' })
  await ui.press({ key: 'save' })
  await ui.press({ key: 'interval' })
  await ui.press({ key: 'save' })
  await ui.press({ key: 'save' })
  expect(JSON.parse(world.files.get(SETTINGS) ?? '').statusLine).toEqual(entryFor('bash', 3))
  await ui.press({ key: 'remove' })
  await ui.press({ key: 'remove' })
  await ui.unmount()

  expect(JSON.parse(world.files.get(SETTINGS) ?? '').statusLine).toEqual(old)
})

test('changes nothing on close, nor when a second press does not come', async ($, on) => {
  const world = surround(on)
  await $.session.start(START)
  await $.command.run(typed('statusline-wizard'))
  const ui = await $.ui.mount({ plugin: 'statusline-wizard', surface: 'terminal', ...PANE })
  await ui.press({ key: 'save' })
  await ui.press({ key: 'section-git' })
  expect(await ui.find({ key: 'save', text: /^ save $/ })).toBeDefined()
  expect(await ui.find({ key: 'item-branch' })).toBeUndefined()
  await ui.press({ key: 'close' })
  await ui.unmount()

  expect(world.files.size).toBe(0)
  expect(world.store.get('choices')).toBeUndefined()
  expect(world.opened).toEqual([])
})

test('leaves a settings file it cannot read as it is', async ($, on) => {
  const world = surround(on, { files: { [SETTINGS]: '{ "model": ' } })
  await $.session.start(START)
  await $.command.run(typed('statusline-wizard'))
  const ui = await $.ui.mount({ plugin: 'statusline-wizard', surface: 'terminal', ...PANE })
  await ui.press({ key: 'save' })
  await ui.unmount()

  expect(world.files.get(SETTINGS)).toBe('{ "model": ')
  expect(world.toasts.at(-1)).toMatch(/could not be read/)
})

const WINDOWS = { OS: 'Windows_NT', USERPROFILE: 'C:\\Users\\me', HOME: '' }
const WINDOWS_SETTINGS = 'C:\\Users\\me/.claude/settings.json'

test('writes the PowerShell form on Windows without Git Bash', async ($, on) => {
  const world = surround(on, { env: WINDOWS })
  await $.session.start(START)
  await $.command.run(typed('statusline-wizard'))
  const ui = await $.ui.mount({ plugin: 'statusline-wizard', surface: 'terminal', ...PANE })
  await ui.press({ key: 'save' })
  await ui.press({ key: 'save' })
  await ui.unmount()

  expect(JSON.parse(world.files.get(WINDOWS_SETTINGS) ?? '').statusLine).toEqual(entryFor('powershell', 2))
})

test('writes the bash form on Windows with Git Bash where Git for Windows installs it', async ($, on) => {
  const world = surround(on, { env: WINDOWS, files: { 'C:\\Program Files\\Git\\bin\\bash.exe': '' } })
  await $.session.start(START)
  await $.command.run(typed('statusline-wizard'))
  const ui = await $.ui.mount({ plugin: 'statusline-wizard', surface: 'terminal', ...PANE })
  await ui.press({ key: 'save' })
  await ui.press({ key: 'save' })
  await ui.unmount()

  expect(JSON.parse(world.files.get(WINDOWS_SETTINGS) ?? '').statusLine).toEqual(entryFor('bash', 2))
})

test('finds Git Bash beside the git on the PATH', async ($, on) => {
  const world = surround(on, {
    env: WINDOWS,
    files: { 'D:\\Tools\\Git\\bin\\bash.exe': '' },
    commands: { where: 'D:\\Tools\\Git\\cmd\\git.exe\r\n' },
  })
  await $.session.start(START)
  await $.command.run(typed('statusline-wizard'))
  const ui = await $.ui.mount({ plugin: 'statusline-wizard', surface: 'terminal', ...PANE })
  await ui.press({ key: 'save' })
  await ui.press({ key: 'save' })
  await ui.unmount()

  expect(JSON.parse(world.files.get(WINDOWS_SETTINGS) ?? '').statusLine).toEqual(entryFor('bash', 2))
})

test('reads the settings from CLAUDE_CONFIG_DIR when it is set', async ($, on) => {
  const world = surround(on, { env: { CLAUDE_CONFIG_DIR: `${HOME}/alt` } })
  await $.session.start(START)
  await $.command.run(typed('statusline-wizard'))
  const ui = await $.ui.mount({ plugin: 'statusline-wizard', surface: 'terminal', ...PANE })
  await ui.press({ key: 'save' })
  await ui.press({ key: 'save' })
  await ui.unmount()

  expect(world.files.has(`${HOME}/alt/settings.json`)).toBe(true)
})

test('marks the settings with a dot while they hold changes not saved', async ($, on) => {
  surround(on, { stored: { choices: SAVED }, files: { [SETTINGS]: JSON.stringify({ statusLine: entryFor('bash', 2) }) } })
  await $.session.start(START)
  await $.command.run(typed('statusline-wizard'))
  const ui = await $.ui.mount({ plugin: 'statusline-wizard', surface: 'terminal', ...PANE })
  expect(await ui.find({ type: 'Text', text: ' •' })).toBeUndefined()
  await ui.press({ key: 'item-user' })
  expect(await ui.find({ type: 'Text', text: ' •' })).toBeDefined()
  await ui.press({ key: 'save' })
  expect(await ui.find({ type: 'Text', text: ' •' })).toBeUndefined()
  expect(await ui.find({ key: 'close' })).toBeDefined()
  await ui.unmount()
})

test('reads an item turned off and on again as no change', async ($, on) => {
  surround(on, { stored: { choices: SAVED }, files: { [SETTINGS]: JSON.stringify({ statusLine: entryFor('bash', 2) }) } })
  await $.session.start(START)
  await $.command.run(typed('statusline-wizard'))
  const ui = await $.ui.mount({ plugin: 'statusline-wizard', surface: 'terminal', ...PANE })
  await ui.press({ key: 'item-folder' })
  await ui.press({ key: 'item-folder' })
  expect(await ui.find({ type: 'Text', text: ' •' })).toBeUndefined()
  await ui.unmount()
})

test('moves a plan window through off, on and with its reset, the preview following', async ($, on) => {
  surround(on)
  await $.session.start(START)
  await $.command.run(typed('statusline-wizard'))
  const ui = await $.ui.mount({ plugin: 'statusline-wizard', surface: 'terminal', ...PANE })
  expect(await ui.find({ key: 'item-weekly', text: 'off ›' })).toBeDefined()
  await ui.press({ key: 'item-weekly' })
  expect(await ui.find({ key: 'item-weekly', text: 'on ›' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /  7d 8%$/ })).toBeDefined()
  await ui.press({ key: 'item-weekly' })
  expect(await ui.find({ key: 'item-weekly', text: 'with reset ›' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /  7d 8% \(1d 19h\)$/ })).toBeDefined()
  await ui.press({ key: 'item-weekly' })
  expect(await ui.find({ key: 'item-weekly', text: 'off ›' })).toBeDefined()
  await ui.unmount()
})

test('moves the theme on, previews it, and saves the line in its colors', async ($, on) => {
  const world = surround(on, { stored: { choices: { ...SAVED, items: ['branch'] } }, files: { [SETTINGS]: JSON.stringify({ statusLine: entryFor('bash', 2) }) } })
  await $.session.start(START)
  await $.command.run(typed('statusline-wizard'))
  const ui = await $.ui.mount({ plugin: 'statusline-wizard', surface: 'terminal', ...PANE })
  expect(await ui.find({ key: 'theme', text: 'none ›' })).toBeDefined()
  expect(await colorsOf(ui, 'main')).toEqual(['inactive'])
  await ui.press({ key: 'theme' })
  expect(await ui.find({ key: 'theme', text: 'default ›' })).toBeDefined()
  expect(await colorsOf(ui, 'main')).toEqual(['#16A34A'])
  await ui.press({ key: 'save' })
  await ui.unmount()

  expect(world.lines.at(-1)).toBe('\u001b[38;2;22;163;74mmain\u001b[39m')
})

test('takes a custom color per item shown, says when it is not one, and goes back to the default when emptied', async ($, on) => {
  const world = surround(on, { stored: { choices: { ...SAVED, items: ['branch', 'model'], theme: 'tokyo-night' } } })
  await $.session.start(START)
  await $.command.run(typed('statusline-wizard'))
  const ui = await $.ui.mount({ plugin: 'statusline-wizard', surface: 'terminal', ...PANE })
  expect(await ui.find({ key: 'input-branch-0' })).toBeUndefined()
  await ui.press({ key: 'theme' })
  expect(await ui.find({ key: 'theme', text: 'custom ›' })).toBeDefined()
  expect(await ui.find({ key: 'input-folder-0' })).toBeUndefined()
  await ui.input({ key: 'input-branch-0', text: 'f00' })
  expect(await colorsOf(ui, 'main')).toEqual(['#FF0000'])
  await ui.input({ key: 'input-model-1', text: 'red' })
  expect(world.toasts.at(-1)).toMatch(/hex color/)
  expect(await colorsOf(ui, 'Opus 5.5')).toEqual(['#D97757'])
  await ui.input({ key: 'input-branch-2', text: '' })
  expect(await colorsOf(ui, 'main')).toEqual(['#16A34A'])
  await ui.unmount()
})
