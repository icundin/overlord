import { expect, test } from 'claude-code/testing'

import { entryFor, isOurs, statusLineOf, withStatusLine } from './settings'

test('prints the line in the shell Claude Code runs the command in', async () => {
  expect(entryFor('bash', 2)).toEqual({ type: 'command', command: 'echo "$STATUSLINE_WIZARD_LINE"', refreshInterval: 2 })
  expect(entryFor('powershell', 5)).toEqual({ type: 'command', command: '$env:STATUSLINE_WIZARD_LINE', refreshInterval: 5 })
})

test('tells its own entry from any other', async () => {
  expect(isOurs(entryFor('bash', 2))).toBe(true)
  expect(isOurs(entryFor('powershell', 10))).toBe(true)
  expect(isOurs({ type: 'command', command: '~/.claude/statusline.sh' })).toBe(false)
  expect(isOurs(undefined)).toBe(false)
})

test('reads the status line from the settings file', async () => {
  expect(statusLineOf('{ "statusLine": { "type": "command", "command": "x" } }')).toEqual({ type: 'command', command: 'x' })
  expect(statusLineOf('{ "model": "opus" }')).toBeUndefined()
  expect(statusLineOf(null)).toBeUndefined()
})

test('sets the status line and keeps every other setting', async () => {
  const before = '{\n  "model": "opus",\n  "statusLine": { "type": "command", "command": "old" },\n  "theme": "dark"\n}\n'
  const after = withStatusLine(before, entryFor('bash', 2))
  expect(JSON.parse(after)).toEqual({ model: 'opus', statusLine: entryFor('bash', 2), theme: 'dark' })
  expect(Object.keys(JSON.parse(after))).toEqual(['model', 'statusLine', 'theme'])
  expect(after.endsWith('}\n')).toBe(true)
})

test('writes a settings file where there was none', async () => {
  expect(JSON.parse(withStatusLine(null, entryFor('bash', 2)))).toEqual({ statusLine: entryFor('bash', 2) })
})

test('removes the status line when there is none to restore', async () => {
  expect(JSON.parse(withStatusLine('{ "model": "opus", "statusLine": {} }', undefined))).toEqual({ model: 'opus' })
})

test('refuses a settings file it cannot read, rather than overwrite it', async () => {
  expect(() => withStatusLine('{ "model": ', entryFor('bash', 2))).toThrow()
  expect(() => withStatusLine('[]', entryFor('bash', 2))).toThrow()
})
