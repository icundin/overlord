// Numbers, durations, model names and limit labels, as the band writes them.

export function compact(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${trim(tokens / 1_000_000)}M`
  }
  if (tokens >= 1000) {
    const k = tokens / 1000

    return k < 10 ? `${trim(k)}k` : `${Math.round(k)}k`
  }

  return String(tokens)
}

export function share(tokens: number, max: number): string {
  const percent = (tokens / max) * 100

  return percent < 1 ? `${trim(percent)}%` : `${Math.round(percent)}%`
}

function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '')
}

// `$1.16`; an amount that rounds to nothing but is not nothing, `<$0.01`.
export function dollars(usd: number): string {
  return usd > 0 && usd < 0.005 ? '<$0.01' : `$${usd.toFixed(2)}`
}

// `+12k`, `−200k` (a compaction), `+840`.
export function signed(delta: number): string {
  return `${delta < 0 ? '−' : '+'}${compact(Math.abs(delta))}`
}

// `45s`, `2m 7s`, `1h 5m`.
export function duration(ms: number): string {
  const seconds = Math.round(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (minutes < 1) {
    return `${seconds}s`
  }
  if (hours < 1) {
    return seconds % 60 === 0 ? `${minutes}m` : `${minutes}m ${seconds % 60}s`
  }

  return minutes % 60 === 0 ? `${hours}h` : `${hours}h ${minutes % 60}m`
}

// Relative, so it never depends on the time zone the mod runs in: `2 hr 25 min`, `3 d 4 hr`.
export function resetsIn(resetsAt: string, now: number): string {
  return span(Math.max(0, Math.round((Date.parse(resetsAt) - now) / 60_000)))
}

// `just now`, `14 min ago`, `2 hr 5 min ago`.
export function ago(at: number, now: number): string {
  const minutes = Math.floor((now - at) / 60_000)

  return minutes < 1 ? 'just now' : `${span(minutes)} ago`
}

function span(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 60) {
    return `${minutes} min`
  }
  if (hours < 24) {
    return minutes % 60 === 0 ? `${hours} hr` : `${hours} hr ${minutes % 60} min`
  }

  return hours % 24 === 0 ? `${days} d` : `${days} d ${hours % 24} hr`
}

const LIMIT_LABELS: Record<string, string> = {
  five_hour: 'session',
  seven_day: 'weekly · all models',
  spend_limit: 'spend limit',
}

export function limitLabel(kind: string): string {
  return LIMIT_LABELS[kind] ?? kind.replace(/_/g, ' ')
}

export function levelColor(percent: number): string {
  return percent >= 80 ? 'error' : percent >= 50 ? 'warning' : 'success'
}

// `claude-opus-5-5` reads `Opus 5.5`; an id of another shape is shown as given.
export function modelLabel(id: string): string {
  const match = /^claude-([a-z]+)-(\d{1,2})(?:-(\d{1,2}))?(?!\d)/.exec(id)

  if (!match) {
    return id
  }
  const [, family = '', major, minor] = match

  return `${family.charAt(0).toUpperCase()}${family.slice(1)} ${major}${minor ? `.${minor}` : ''}`
}

// What `/effort` accepts.
export const EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'] as const

// The `/model` alias the session runs on: `claude-opus-5-5` on a 1M window is `opus[1m]`.
export function modelAlias(id: string, window: number): string | null {
  const family = /^claude-([a-z]+)-\d/.exec(id)?.[1]

  return family ? `${family}${window >= 1_000_000 ? '[1m]' : ''}` : null
}

// `/model` choices that name another one (`default`, `best`) or a mode (`opusplan`), not a model.
const NOT_A_MODEL = new Set(['default', 'best', 'opusplan'])

// The config menu's /model choices, models only: `sonnet`, `opus[1m]`, ...
export function modelChoices(options: readonly string[]): string[] {
  return options.filter(option => !NOT_A_MODEL.has(option))
}
