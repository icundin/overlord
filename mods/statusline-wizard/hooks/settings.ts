// The shell Claude Code runs a status line command in: bash, Git Bash on Windows, else PowerShell.
export type Shell = 'bash' | 'powershell'

// The env var each session keeps its line in; the command only prints it.
const COMMANDS: Record<Shell, string> = {
  bash: 'echo "$STATUSLINE_WIZARD_LINE"',
  powershell: '$env:STATUSLINE_WIZARD_LINE',
}

export function entryFor(shell: Shell, interval: number) {
  return { type: 'command', command: COMMANDS[shell], refreshInterval: interval }
}

export function isOurs(statusLine: unknown): boolean {
  const command = (statusLine as { command?: unknown } | null | undefined)?.command

  return Object.values(COMMANDS).some(one => one === command)
}

export function statusLineOf(text: string | null): unknown {
  return text === null ? undefined : parse(text).statusLine
}

// The settings file's text with `statusLine` set, or removed for undefined; every other key kept in its place.
export function withStatusLine(text: string | null, statusLine: unknown): string {
  const settings = text === null ? {} : parse(text)
  const next = statusLine === undefined ? omit(settings, 'statusLine') : { ...settings, statusLine }

  return `${JSON.stringify(next, null, 2)}\n`
}

function parse(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('the settings file does not hold an object')
  }

  return value as Record<string, unknown>
}

function omit(settings: Record<string, unknown>, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(settings).filter(([name]) => name !== key))
}
