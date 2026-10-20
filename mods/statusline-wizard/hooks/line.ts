import type { Choices, Facts, Group, ItemKey, Limit } from '../types'

// One item: the pane's section and label for it, its icon, and its text, or null with no reading.
type Item = { key: ItemKey; group: Group; label: string; icon: string | null; text: (facts: Facts, icons: boolean) => string | null }

// Every item in the order the line shows them.
export const ITEMS: Item[] = [
  { key: 'user', group: 'system', label: 'user@host', icon: '👤', text: f => (f.user && f.host ? `${f.user}@${f.host}` : (f.user ?? f.host)) },
  { key: 'folder', group: 'system', label: 'folder', icon: '📁', text: f => (f.cwd === null ? null : shortPath(f.cwd, f.home)) },
  { key: 'branch', group: 'git', label: 'branch', icon: '🌿', text: f => f.git?.branch ?? null },
  { key: 'ahead', group: 'git', label: '↑ not pushed', icon: null, text: f => (f.git && f.git.ahead > 0 ? `↑${f.git.ahead}` : null) },
  { key: 'dirty', group: 'git', label: '● changes', icon: null, text: f => (f.git?.isDirty ? '●' : null) },
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
  {
    key: 'context',
    group: 'agent',
    label: 'context',
    icon: '📊',
    text: (f, icons) => (f.context === null ? null : `${icons ? '' : 'ctx '}${f.context}%`),
  },
  { key: 'limits', group: 'agent', label: 'plan usage', icon: '⏳', text: f => (f.limits.length === 0 ? null : f.limits.map(limitText).join(' · ')) },
  { key: 'cost', group: 'agent', label: 'cost', icon: '💰', text: f => (f.cost === null ? null : dollars(f.cost)) },
]

// The git items stand together, one space apart, as a prompt shows them: `main ↑2 ●`.
const GIT: ItemKey[] = ['branch', 'ahead', 'dirty']

export function line(choices: Choices, facts: Facts): string {
  return pieces(choices, facts).join('  ')
}

// The line's pieces in order, two spaces apart in the line: one per item, the git items one piece together.
export function pieces(choices: Choices, facts: Facts): string[] {
  const groups: string[][] = []
  let wasGit = false
  for (const item of ITEMS) {
    if (!choices.items.includes(item.key)) {
      continue
    }
    const text = item.text(facts, choices.icons)
    if (text === null) {
      continue
    }
    const shown = choices.icons && item.icon ? `${item.icon} ${text}` : text
    const isGit = GIT.includes(item.key)
    if (isGit && wasGit) {
      groups[groups.length - 1]?.push(shown)
    } else {
      groups.push([shown])
    }
    wasGit = isGit
  }

  return groups.map(group => group.join(' '))
}

const LIMIT_NAMES: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' }

function limitText({ kind, percentUsed }: Limit): string {
  return `${LIMIT_NAMES[kind] ?? kind} ${Math.round(percentUsed)}%`
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
