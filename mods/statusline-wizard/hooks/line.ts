import type { Choices, Facts, Group, Hue, ItemKey, Window } from '../types'
import { ansi, colorOf } from './themes'

// Items that stand together, and how one joins the one before it: the git state as a prompt shows it (`main ↑2 ●`),
// the model and its effort (`Opus 5.5 (high)`), the context and its tokens (`5% · 45k / 1M`), the plan windows
// (`5h 12% · 7d 8%`). The first one shown wears the cluster's mark.
type Cluster = 'git' | 'model' | 'context' | 'limits'

const JOINERS: Record<Cluster, (text: string) => string> = {
  git: text => ` ${text}`,
  model: text => ` (${text})`,
  context: text => ` · ${text}`,
  limits: text => ` · ${text}`,
}

// One item: the pane's section and label for it, the kind of item a theme colors it as, what marks it in the line
// (its icon, or with icons off a word, if any), and its text, or null with nothing to show.
type Item = {
  key: ItemKey
  group: Group
  hue: Hue
  label: string
  icon: string
  word?: string
  cluster?: Cluster
  text: (facts: Facts, choices: Choices) => string | null
}

const SYSTEM = { group: 'system', hue: 'system' } as const
const GIT = { group: 'git', hue: 'git', icon: '🌿', cluster: 'git' } as const
const MODEL = { group: 'agent', hue: 'model', icon: '🤖', cluster: 'model' } as const
const CONTEXT = { group: 'agent', hue: 'context', icon: '📊', word: 'ctx', cluster: 'context' } as const
const LIMITS = { group: 'agent', hue: 'usage', icon: '⏳', cluster: 'limits' } as const

// Every item in the order the line shows them.
export const ITEMS: Item[] = [
  { key: 'clock', ...SYSTEM, label: 'clock', icon: '🕐', text: f => f.time },
  { key: 'user', ...SYSTEM, label: 'user@host', icon: '👤', text: f => (f.user && f.host ? `${f.user}@${f.host}` : (f.user ?? f.host)) },
  { key: 'folder', ...SYSTEM, label: 'folder', icon: '📁', text: f => (f.cwd === null ? null : shortPath(f.cwd, f.home)) },
  { key: 'repo', group: 'git', hue: 'git', label: 'repository', icon: '📦', text: f => f.repo },
  { key: 'branch', ...GIT, label: 'branch', text: f => f.git?.branch ?? null },
  { key: 'ahead', ...GIT, label: '↑ not pushed', text: f => (f.git && f.git.ahead > 0 ? `↑${f.git.ahead}` : null) },
  { key: 'behind', ...GIT, label: '↓ not pulled', text: f => (f.git && f.git.behind > 0 ? `↓${f.git.behind}` : null) },
  { key: 'dirty', ...GIT, label: '● changes', text: f => (f.git?.isDirty ? '●' : null) },
  { key: 'counts', ...GIT, label: 'file counts', text: f => (f.git === null ? null : fileCounts(f.git)) },
  {
    key: 'pr',
    group: 'git',
    hue: 'pr',
    label: 'pull request',
    icon: '🔀',
    text: f => (f.pr === null ? null : [`PR #${f.pr.number}`, f.pr.review].filter(Boolean).join(' ')),
  },
  { key: 'model', ...MODEL, label: 'model', text: f => (f.model === null ? null : modelLabel(f.model)) },
  { key: 'effort', ...MODEL, label: 'effort', text: f => f.effort },
  { key: 'context', ...CONTEXT, label: 'context', text: f => (f.context === null ? null : `${f.context}%`) },
  {
    key: 'tokens',
    ...CONTEXT,
    label: 'tokens',
    text: f => (f.tokens === null ? null : `${compact(f.tokens.used)} / ${compact(f.tokens.window)}`),
  },
  { key: 'session', ...LIMITS, label: 'session usage', text: (f, choices) => limitText(f, choices, 'session') },
  { key: 'weekly', ...LIMITS, label: 'weekly usage', text: (f, choices) => limitText(f, choices, 'weekly') },
  { key: 'spend', ...LIMITS, label: 'gateway spend', text: (f, choices) => limitText(f, choices, 'spend') },
  { key: 'cost', group: 'agent', hue: 'cost', label: 'cost', icon: '💰', text: f => (f.cost === null ? null : dollars(f.cost)) },
]

// One item's part of the line, in its color; null for the line's own.
export type Segment = { text: string; color: string | null }

// A piece of the line: one item, or a cluster's items together.
export type Piece = Segment[]

// The line as the command prints it, each item in its color.
export function line(choices: Choices, facts: Facts): string {
  return pieces(choices, facts)
    .map(piece => piece.map(({ text, color }) => ansi(text, color)).join(''))
    .join('  ')
}

export const plain = (piece: Piece) => piece.map(segment => segment.text).join('')

// The line's pieces in order, two spaces apart in the line: one per item, a cluster's items one piece together.
export function pieces(choices: Choices, facts: Facts): Piece[] {
  const out: Piece[] = []
  let cluster: Cluster | null = null
  for (const item of ITEMS) {
    const text = choices.items.includes(item.key) ? item.text(facts, choices) : null
    if (text === null) {
      continue
    }
    const color = colorOf(choices, item.key, item.hue)
    const last = out.at(-1)
    if (item.cluster !== undefined && item.cluster === cluster && last !== undefined) {
      last.push({ text: JOINERS[item.cluster](text), color })
      continue
    }
    const mark = choices.icons ? item.icon : item.word
    out.push([{ text: mark ? `${mark} ${text}` : text, color }])
    cluster = item.cluster ?? null
  }

  return out
}

// `+2 ~3 ?1`: files staged, modified and untracked, those that are none left out.
function fileCounts({ staged, modified, untracked }: { staged: number; modified: number; untracked: number }): string | null {
  const parts = [`+${staged}`, `~${modified}`, `?${untracked}`].filter((_, i) => [staged, modified, untracked][i] !== 0)

  return parts.length === 0 ? null : parts.join(' ')
}

// Each window's kind as Claude Code names it, and its name in the line.
const WINDOWS: Record<Window, { kind: string; name: string }> = {
  session: { kind: 'five_hour', name: '5h' },
  weekly: { kind: 'seven_day', name: '7d' },
  spend: { kind: 'spend_limit', name: 'spend' },
}

// A plan window and its share used, with how long until it resets where the person asked for it; null without a
// reading of it.
function limitText(facts: Facts, choices: Choices, window: Window): string | null {
  const { kind, name } = WINDOWS[window]
  const limit = facts.limits.find(one => one.kind === kind)
  if (limit === undefined) {
    return null
  }
  const left = choices.resets.includes(window) && facts.now !== null ? countdown(limit.resetsAt, facts.now) : null

  return `${name} ${Math.round(limit.percentUsed)}%${left === null ? '' : ` (${left})`}`
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// How long until `at`, in its two largest units (`2h 13m`, `1d 19h`); null once it has passed.
export function countdown(at: string | null, now: number): string | null {
  const left = at === null ? 0 : Date.parse(at) - now
  if (!(left > 0)) {
    return null
  }
  const [big, bigName, small, smallName] =
    left >= DAY ? [DAY, 'd', HOUR, 'h'] : left >= HOUR ? [HOUR, 'h', MINUTE, 'm'] : [MINUTE, 'm', 0, '']
  const whole = Math.floor(left / big)
  const rest = small === 0 ? 0 : Math.floor((left % big) / small)

  return rest === 0 ? `${Math.max(1, whole)}${bigName}` : `${whole}${bigName} ${rest}${smallName}`
}

// A token count short: `840`, `3.4k`, `45k`, `1M`, `1.5M`.
export function compact(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${Number((tokens / 1_000_000).toFixed(1))}M`
  }
  if (tokens >= 1000) {
    return tokens < 10_000 ? `${Number((tokens / 1000).toFixed(1))}k` : `${Math.round(tokens / 1000)}k`
  }

  return String(tokens)
}

// The time on the 24-hour clock, in the session's own time zone.
export function clockText(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// The folder with the home folder written `~`, on either separator.
export function shortPath(path: string, home: string | null): string {
  if (home === null || home === '') {
    return path
  }
  if (path === home) {
    return '~'
  }
  const rest = path.slice(home.length)

  return path.startsWith(home) && (rest.startsWith('/') || rest.startsWith('\\')) ? `~${rest}` : path
}

export function modelLabel(id: string): string {
  const match = /^claude-([a-z]+)-(\d{1,2})(?:-(\d{1,2}))?(?!\d)/.exec(id)

  if (!match) {
    return id
  }
  const [, family = '', major, minor] = match

  return `${family.charAt(0).toUpperCase()}${family.slice(1)} ${major}${minor ? `.${minor}` : ''}`
}

export function dollars(usd: number): string {
  return usd > 0 && usd < 0.005 ? '<$0.01' : `$${usd.toFixed(2)}`
}
