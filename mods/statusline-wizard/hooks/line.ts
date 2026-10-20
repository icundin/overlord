import type { Choices, Facts, Group, ItemKey, Limit } from '../types'

// Items that stand together, the joiner between them: the git state as a prompt shows it (`main ↑2 ●`), the context
// and its tokens (`5% · 45k / 1M`). The first one shown wears the cluster's mark.
type Cluster = 'git' | 'context'

const JOINERS: Record<Cluster, string> = { git: ' ', context: ' · ' }

// One item: the pane's section and label for it, what marks it in the line (its icon, or with icons off a word, if
// any), and its text, or null with nothing to show.
type Item = {
  key: ItemKey
  group: Group
  label: string
  icon: string
  word?: string
  cluster?: Cluster
  text: (facts: Facts, choices: Choices) => string | null
}

const GIT = { group: 'git', icon: '🌿', cluster: 'git' } as const
const CONTEXT = { group: 'agent', icon: '📊', word: 'ctx', cluster: 'context' } as const

// Every item in the order the line shows them.
export const ITEMS: Item[] = [
  { key: 'user', group: 'system', label: 'user@host', icon: '👤', text: f => (f.user && f.host ? `${f.user}@${f.host}` : (f.user ?? f.host)) },
  { key: 'folder', group: 'system', label: 'folder', icon: '📁', text: f => (f.cwd === null ? null : shortPath(f.cwd, f.home)) },
  { key: 'branch', ...GIT, label: 'branch', text: f => f.git?.branch ?? null },
  { key: 'ahead', ...GIT, label: '↑ not pushed', text: f => (f.git && f.git.ahead > 0 ? `↑${f.git.ahead}` : null) },
  { key: 'behind', ...GIT, label: '↓ not pulled', text: f => (f.git && f.git.behind > 0 ? `↓${f.git.behind}` : null) },
  { key: 'dirty', ...GIT, label: '● changes', text: f => (f.git?.isDirty ? '●' : null) },
  { key: 'counts', ...GIT, label: 'file counts', text: f => (f.git === null ? null : fileCounts(f.git)) },
  { key: 'repo', group: 'git', label: 'repository', icon: '📦', text: f => f.repo },
  {
    key: 'pr',
    group: 'git',
    label: 'pull request',
    icon: '🔀',
    text: f => (f.pr === null ? null : [`PR #${f.pr.number}`, f.pr.review].filter(Boolean).join(' ')),
  },
  { key: 'model', group: 'agent', label: 'model', icon: '🤖', text: f => (f.model === null ? null : modelLabel(f.model)) },
  { key: 'effort', group: 'agent', label: 'effort', icon: '🧠', text: f => f.effort },
  { key: 'context', ...CONTEXT, label: 'context', text: f => (f.context === null ? null : `${f.context}%`) },
  {
    key: 'tokens',
    ...CONTEXT,
    label: 'tokens',
    text: f => (f.tokens === null ? null : `${compact(f.tokens.used)} / ${compact(f.tokens.window)}`),
  },
  {
    key: 'limits',
    group: 'agent',
    label: 'plan usage',
    icon: '⏳',
    text: (f, choices) =>
      f.limits.length === 0 ? null : f.limits.map(limit => limitText(limit, choices.items.includes('resets') ? f.now : null)).join(' · '),
  },
  // Shown inside plan usage, after each window.
  { key: 'resets', group: 'agent', label: 'plan resets', icon: '⏳', text: () => null },
  { key: 'cost', group: 'agent', label: 'cost', icon: '💰', text: f => (f.cost === null ? null : dollars(f.cost)) },
  { key: 'clock', group: 'system', label: 'clock', icon: '🕐', text: f => f.time },
]

export function line(choices: Choices, facts: Facts): string {
  return pieces(choices, facts).join('  ')
}

// The line's pieces in order, two spaces apart in the line: one per item, a cluster's items one piece together.
export function pieces(choices: Choices, facts: Facts): string[] {
  const out: string[] = []
  let cluster: Cluster | null = null
  for (const item of ITEMS) {
    const text = choices.items.includes(item.key) ? item.text(facts, choices) : null
    if (text === null) {
      continue
    }
    if (item.cluster !== undefined && item.cluster === cluster && out.length > 0) {
      out[out.length - 1] += `${JOINERS[item.cluster]}${text}`
      continue
    }
    const mark = choices.icons ? item.icon : item.word
    out.push(mark ? `${mark} ${text}` : text)
    cluster = item.cluster ?? null
  }

  return out
}

// `+2 ~3 ?1`: files staged, modified and untracked, those that are none left out.
function fileCounts({ staged, modified, untracked }: { staged: number; modified: number; untracked: number }): string | null {
  const parts = [`+${staged}`, `~${modified}`, `?${untracked}`].filter((_, i) => [staged, modified, untracked][i] !== 0)

  return parts.length === 0 ? null : parts.join(' ')
}

const LIMIT_NAMES: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' }

// A plan window and its share used, with how long until it resets when `now` is given.
function limitText({ kind, percentUsed, resetsAt }: Limit, now: number | null): string {
  const left = now === null ? null : countdown(resetsAt, now)

  return `${LIMIT_NAMES[kind] ?? kind} ${Math.round(percentUsed)}%${left === null ? '' : ` (${left})`}`
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
